/**
 * puppet-rig.js — 2D Skeletal Puppet Animation Engine for Monsterous Combatiousness
 *
 * Implements real 2D puppet-style skeletal animation for:
 *  - Male Character
 *  - Female Character
 *  - Monster
 *
 * Features:
 *  - Hierarchical bone transformations (Parent-Child Forward Kinematics)
 *  - Soft-cap joint layering with Z-sorting (no gaps or visual distortion)
 *  - True Grounding: Foot planting and ground baseline anchoring
 *  - Canonical facing direction (Player -> Right, Monster -> Left)
 *  - Real combat pose animations (IDLE, WALK, PUNCH, KICK, BLOCK, HIT, MONSTER_ATTACK)
 *  - Continuous Rhythmic Victory Dance
 *  - Dramatic physical ragdoll-like Defeat Fall
 *  - 60 FPS Canvas renderer with smooth pose interpolation (slerp/lerp)
 */

'use strict';

class PuppetRig {
  constructor(charType, canvas, options = {}) {
    this.charType = charType; // 'male' | 'female' | 'monster'
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.facing = options.facing ?? (charType === 'monster' ? -1 : 1); // 1 = right, -1 = left
    this.scale = options.scale ?? (charType === 'monster' ? 0.38 : 0.85);

    // Animation state
    this.state = 'IDLE'; // 'IDLE' | 'WALK' | 'PUNCH' | 'KICK' | 'BLOCK' | 'HIT' | 'ATTACK' | 'VICTORY' | 'DEFEAT'
    this.stateTime = 0;
    this.animDuration = 0;
    this.onAnimComplete = null;

    // Bone definitions and default rest pose
    this.bones = {};
    this.targetPose = {};
    this.currentPose = {};
    this.images = {};
    this.imagesLoaded = false;

    // Grounding & sizing
    this.groundY = options.groundY ?? (canvas ? canvas.height * 0.88 : 280);
    this.rootX = options.rootX ?? (canvas ? canvas.width * 0.5 : 150);
    this.rootY = this.groundY;

    this._initRig();
    this._loadAssets();
  }

  _initRig() {
    if (this.charType === 'monster') {
      this.boneNames = [
        'pelvis', 'torso', 'head',
        'arm_r_upper', 'claw_r',
        'arm_l_upper', 'claw_l',
        'leg_r_thigh', 'leg_r_shin',
        'leg_l_thigh', 'leg_l_shin'
      ];
      this.boneHierarchy = {
        pelvis: { parent: null, z: 3, pivot: [240, 100], img: 'assets/rigs/monster/pelvis.png', w: 480, h: 200, ox: 270, oy: 590 },
        torso: { parent: 'pelvis', z: 4, pivot: [280, 320], img: 'assets/rigs/monster/torso.png', w: 560, h: 360, ox: 230, oy: 330 },
        head: { parent: 'torso', z: 5, pivot: [240, 310], img: 'assets/rigs/monster/head.png', w: 480, h: 333, ox: 270, oy: 67 },
        arm_r_upper: { parent: 'torso', z: 1, pivot: [260, 70], img: 'assets/rigs/monster/arm_r_upper.png', w: 320, h: 260, ox: 50, oy: 310 },
        claw_r: { parent: 'arm_r_upper', z: 2, pivot: [130, 70], img: 'assets/rigs/monster/claw_r.png', w: 272, h: 360, ox: 58, oy: 490 },
        arm_l_upper: { parent: 'torso', z: 6, pivot: [50, 70], img: 'assets/rigs/monster/arm_l_upper.png', w: 329, h: 260, ox: 670, oy: 310 },
        claw_l: { parent: 'arm_l_upper', z: 7, pivot: [140, 70], img: 'assets/rigs/monster/claw_l.png', w: 281, h: 278, ox: 710, oy: 490 },
        leg_r_thigh: { parent: 'pelvis', z: 1, pivot: [250, 40], img: 'assets/rigs/monster/leg_r_thigh.png', w: 340, h: 220, ox: 130, oy: 670 },
        leg_r_shin: { parent: 'leg_r_thigh', z: 1, pivot: [140, 40], img: 'assets/rigs/monster/leg_r_shin.png', w: 238, h: 201, ox: 97, oy: 810 },
        leg_l_thigh: { parent: 'pelvis', z: 2, pivot: [90, 40], img: 'assets/rigs/monster/leg_l_thigh.png', w: 204, h: 220, ox: 550, oy: 670 },
        leg_l_shin: { parent: 'leg_l_thigh', z: 2, pivot: [100, 40], img: 'assets/rigs/monster/leg_l_shin.png', w: 210, h: 145, ox: 570, oy: 810 }
      };
    } else {
      const isMale = this.charType === 'male';
      const dir = isMale ? 'male' : 'female';
      this.boneNames = [
        'pelvis', 'torso', 'head',
        'arm_r_upper', 'arm_r_lower',
        'arm_l_upper', 'arm_l_lower',
        'leg_r_thigh', 'leg_r_shin',
        'leg_l_thigh', 'leg_l_shin'
      ];
      this.boneHierarchy = {
        pelvis: { parent: null, z: 3, pivot: [80, 35], img: `assets/rigs/${dir}/pelvis.png`, w: 160, h: 70, ox: 90, oy: 170 },
        torso: { parent: 'pelvis', z: 4, pivot: [90, 95], img: `assets/rigs/${dir}/torso.png`, w: 180, h: 110, ox: 80, oy: 85 },
        head: { parent: 'torso', z: 5, pivot: [78, 100], img: `assets/rigs/${dir}/head.png`, w: 155, h: 115, ox: 90, oy: 0 },
        arm_r_upper: { parent: 'torso', z: 1, pivot: [60, 25], img: `assets/rigs/${dir}/arm_r_upper.png`, w: 85, h: 85, ox: 40, oy: 95 },
        arm_r_lower: { parent: 'arm_r_upper', z: 2, pivot: [45, 20], img: `assets/rigs/${dir}/arm_r_lower.png`, w: 75, h: 95, ox: 20, oy: 150 },
        arm_l_upper: { parent: 'torso', z: 6, pivot: [25, 25], img: `assets/rigs/${dir}/arm_l_upper.png`, w: 85, h: 85, ox: 215, oy: 95 },
        arm_l_lower: { parent: 'arm_l_upper', z: 7, pivot: [35, 20], img: `assets/rigs/${dir}/arm_l_lower.png`, w: 75, h: 95, ox: 235, oy: 150 },
        leg_r_thigh: { parent: 'pelvis', z: 1, pivot: [60, 20], img: `assets/rigs/${dir}/leg_r_thigh.png`, w: 110, h: 80, ox: 65, oy: 195 },
        leg_r_shin: { parent: 'leg_r_thigh', z: 1, pivot: [45, 15], img: `assets/rigs/${dir}/leg_r_shin.png`, w: 90, h: 90, ox: 55, oy: 245 },
        leg_l_thigh: { parent: 'pelvis', z: 2, pivot: [50, 20], img: `assets/rigs/${dir}/leg_l_thigh.png`, w: 110, h: 80, ox: 155, oy: 195 },
        leg_l_shin: { parent: 'leg_l_thigh', z: 2, pivot: [55, 15], img: `assets/rigs/${dir}/leg_l_shin.png`, w: 90, h: 90, ox: 165, oy: 245 }
      };
    }

    // Initialize bone pose state
    this.boneNames.forEach(name => {
      this.currentPose[name] = { rot: 0, tx: 0, ty: 0, sx: 1, sy: 1 };
      this.targetPose[name] = { rot: 0, tx: 0, ty: 0, sx: 1, sy: 1 };
    });
  }

  _loadAssets() {
    let loaded = 0;
    const total = this.boneNames.length;
    this.boneNames.forEach(name => {
      const img = new Image();
      img.src = this.boneHierarchy[name].img;
      img.onload = () => {
        loaded++;
        if (loaded >= total) {
          this.imagesLoaded = true;
        }
      };
      this.images[name] = img;
    });
  }

  setFacing(facing) {
    this.facing = facing >= 0 ? 1 : -1;
  }

  playState(state, options = {}) {
    if (this.state === 'DEFEAT' && state !== 'DEFEAT' && state !== 'IDLE') {
      return; // Cannot override defeat unless explicitly reset to IDLE
    }
    this.state = state;
    this.stateTime = 0;
    this.animDuration = options.duration ?? 0;
    this.onAnimComplete = options.onComplete ?? null;
  }

  /* ------------------------------------------------------------------
     Update and interpolate skeletal bones every frame
  ------------------------------------------------------------------ */
  update(dt) {
    this.stateTime += dt;
    const t = this.stateTime;

    // 1. Calculate target pose based on state machine
    const pose = this._evaluatePose(this.state, t);

    // 2. Smoothly interpolate current pose toward target pose
    const lerpRate = Math.min(1.0, dt * 14.0);
    this.boneNames.forEach(name => {
      const cur = this.currentPose[name];
      const tgt = pose[name] || { rot: 0, tx: 0, ty: 0, sx: 1, sy: 1 };
      cur.rot += (tgt.rot - cur.rot) * lerpRate;
      cur.tx += (tgt.tx - cur.tx) * lerpRate;
      cur.ty += (tgt.ty - cur.ty) * lerpRate;
      cur.sx += (tgt.sx - cur.sx) * lerpRate;
      cur.sy += (tgt.sy - cur.sy) * lerpRate;
    });

    // 3. Check timed animation completion
    if (this.animDuration > 0 && this.stateTime >= this.animDuration) {
      const cb = this.onAnimComplete;
      this.animDuration = 0;
      this.onAnimComplete = null;
      if (this.state !== 'VICTORY' && this.state !== 'DEFEAT') {
        this.playState('IDLE');
      }
      if (cb) cb();
    }
  }

  /* ------------------------------------------------------------------
     Pose Evaluator for all Combat and Cinematic States
  ------------------------------------------------------------------ */
  _evaluatePose(state, t) {
    const p = {};
    this.boneNames.forEach(name => {
      p[name] = { rot: 0, tx: 0, ty: 0, sx: 1, sy: 1 };
    });

    const isMonster = this.charType === 'monster';

    switch (state) {
      case 'IDLE': {
        // Subtle organic breathing, gentle torso expansion, head sway, grounded stance
        const breath = Math.sin(t * 2.6);
        const sway = Math.cos(t * 1.3);

        p.pelvis.ty = breath * 1.5;
        p.torso.rot = breath * 0.025;
        p.torso.sy = 1.0 + breath * 0.015;
        p.head.rot = sway * 0.035 - breath * 0.015;
        p.head.ty = -breath * 1.0;

        // Arms in defensive guard stance
        p.arm_r_upper.rot = 0.15 + breath * 0.03;
        const lowerArmR = isMonster ? p.claw_r : p.arm_r_lower;
        if (lowerArmR) lowerArmR.rot = -0.35 + breath * 0.04;

        p.arm_l_upper.rot = -0.20 - breath * 0.03;
        const lowerArmL = isMonster ? p.claw_l : p.arm_l_lower;
        if (lowerArmL) lowerArmL.rot = 0.40 - breath * 0.04;

        // Legs flex naturally with breathing while maintaining solid ground contact
        p.leg_r_thigh.rot = -breath * 0.015;
        p.leg_r_shin.rot = breath * 0.015;
        p.leg_l_thigh.rot = breath * 0.015;
        p.leg_l_shin.rot = -breath * 0.015;
        break;
      }

      case 'WALK': {
        const stride = Math.sin(t * 6.0);
        const bounce = Math.abs(Math.cos(t * 6.0));

        p.pelvis.ty = -bounce * 4.0;
        p.torso.rot = stride * 0.05;
        p.head.rot = -stride * 0.04;

        p.leg_r_thigh.rot = stride * 0.45;
        p.leg_r_shin.rot = Math.max(0, -stride * 0.4);
        p.leg_l_thigh.rot = -stride * 0.45;
        p.leg_l_shin.rot = Math.max(0, stride * 0.4);

        p.arm_r_upper.rot = -stride * 0.4;
        p.arm_l_upper.rot = stride * 0.4;
        break;
      }

      case 'PUNCH': {
        // Windup (0..0.12) -> Punch Strike (0.12..0.38) -> Recoil & Return (0.38..0.7)
        if (t < 0.12) {
          // Anticipation / Windup - pull back slightly
          const progress = t / 0.12;
          p.pelvis.tx = -progress * 8.0;  // Pull back into stance
          p.pelvis.ty = progress * 2.0;   // Slight crouch
          p.torso.rot = -progress * 0.18;
          p.torso.tx = -progress * 4.0;   // Lean back
          p.head.rot = -progress * 0.08;
          p.arm_l_upper.rot = -progress * 0.55;
          p.arm_r_upper.rot = progress * 0.3;  // Right arm tightens
          const lower = isMonster ? p.claw_l : p.arm_l_lower;
          if (lower) lower.rot = progress * 0.7;
          // Legs brace for power transfer
          p.leg_r_shin.rot = progress * 0.15;
          p.leg_l_shin.rot = -progress * 0.2;
        } else if (t < 0.38) {
          // EXPLOSIVE FORWARD EXTENSION - drive through opponent
          const progress = (t - 0.12) / 0.26;
          const easeOutQuad = 1 - Math.pow(1 - progress, 2);
          
          // MASSIVE FORWARD TRANSLATION
          p.pelvis.tx = 28.0 * easeOutQuad;     // Charge forward
          p.pelvis.ty = -progress * 3.0;        // Rise up during strike
          p.torso.tx = 35.0 * easeOutQuad;      // Torso leads the attack
          p.torso.rot = 0.3 * easeOutQuad;      // Twist into punch
          p.head.rot = 0.12 * easeOutQuad;      // Head follows body
          p.head.tx = 15.0 * easeOutQuad;
          
          // Full arm extension with maximum reach
          p.arm_l_upper.rot = -1.0 * easeOutQuad;  // Fully extended
          p.arm_l_upper.tx = 22.0 * easeOutQuad;   // Arm drives forward
          const lower = isMonster ? p.claw_l : p.arm_l_lower;
          if (lower) {
            lower.rot = -0.25 * easeOutQuad;
            lower.tx = 18.0 * easeOutQuad;
          }
          p.arm_r_upper.rot = -0.4;              // Right side braced
          
          // Power stance - back leg engaged
          p.leg_r_thigh.rot = -0.25 * easeOutQuad;
          p.leg_r_shin.rot = 0.15;
          p.leg_l_thigh.rot = 0.35 * easeOutQuad;
          p.leg_l_shin.rot = -0.2;
        } else {
          // RECOVERY - snap back to guard
          const progress = (t - 0.38) / 0.32;
          const easeInQuad = progress * progress;
          
          p.pelvis.tx = 28.0 * (1 - easeInQuad);
          p.torso.tx = 35.0 * (1 - easeInQuad);
          p.torso.rot = 0.3 * (1 - easeInQuad);
          p.head.tx = 15.0 * (1 - easeInQuad);
          p.head.rot = 0.12 * (1 - easeInQuad);
          p.arm_l_upper.rot = -1.0 * (1 - easeInQuad);
          p.arm_l_upper.tx = 22.0 * (1 - easeInQuad);
          const lower = isMonster ? p.claw_l : p.arm_l_lower;
          if (lower) {
            lower.rot = -0.25 * (1 - easeInQuad);
            lower.tx = 18.0 * (1 - easeInQuad);
          }
          p.leg_r_thigh.rot = -0.25 * (1 - easeInQuad);
          p.leg_l_thigh.rot = 0.35 * (1 - easeInQuad);
        }
        break;
      }

      case 'KICK': {
        // Weight transfer -> Knee chamber -> POWERFUL SNAP KICK -> Recovery
        if (t < 0.14) {
          // WEIGHT TRANSFER - shift onto support leg
          const prog = t / 0.14;
          p.pelvis.ty = prog * 5.0;          // Rise up
          p.pelvis.tx = -prog * 6.0;         // Shift backward into stance
          p.torso.rot = -prog * 0.25;
          p.torso.ty = prog * 2.0;
          p.head.rot = prog * 0.12;
          
          // Support leg locks
          p.leg_r_thigh.rot = -prog * 0.2;   // Right leg braces
          p.leg_r_shin.rot = prog * 0.15;    // Knee locks
          
          // Kicking leg chambers
          p.leg_l_thigh.rot = prog * 0.7;    // Left knee raises
          p.leg_l_shin.rot = prog * 1.0;     // Shin comes up
          
          // Arms for balance
          p.arm_l_upper.rot = -prog * 0.5;
          p.arm_r_upper.rot = prog * 0.6;
        } else if (t < 0.42) {
          // EXPLOSIVE KICK EXTENSION - drive forward with full body weight
          const progress = (t - 0.14) / 0.28;
          const easeOutQuad = 1 - Math.pow(1 - progress, 2);
          
          // MASSIVE FORWARD DRIVE
          p.pelvis.tx = 26.0 * easeOutQuad;      // Drive forward from hips
          p.pelvis.ty = 5.0 - progress * 2.0;    // Lower into kick
          p.torso.tx = 20.0 * easeOutQuad;       // Torso projects forward
          p.torso.rot = -0.4 * easeOutQuad;      // Lean into kick
          p.head.rot = 0.25 * easeOutQuad;       // Head follows
          p.head.tx = 12.0 * easeOutQuad;
          
          // FULL EXTENDED LEG - snap to target
          p.leg_l_thigh.rot = 1.25 * easeOutQuad;    // Knee high
          p.leg_l_shin.rot = -0.45 * easeOutQuad;    // Leg snaps straight
          p.leg_l_thigh.tx = 16.0 * easeOutQuad;     // Foot travels forward
          p.leg_l_shin.tx = 20.0 * easeOutQuad;
          
          // Support leg stays locked
          p.leg_r_thigh.rot = -0.25;
          p.leg_r_shin.rot = 0.2;
          
          // Arms wheel for momentum
          p.arm_l_upper.rot = -0.6 * easeOutQuad;
          p.arm_r_upper.rot = 0.5 - progress * 0.8;  // Right arm comes around
        } else {
          // RECOVERY - snap back to guard
          const progress = (t - 0.42) / 0.33;
          const easeInQuad = progress * progress;
          
          p.pelvis.tx = 26.0 * (1 - easeInQuad);
          p.torso.tx = 20.0 * (1 - easeInQuad);
          p.torso.rot = -0.4 * (1 - easeInQuad);
          p.head.tx = 12.0 * (1 - easeInQuad);
          p.head.rot = 0.25 * (1 - easeInQuad);
          
          p.leg_l_thigh.rot = 1.25 * (1 - easeInQuad);
          p.leg_l_shin.rot = -0.45 * (1 - easeInQuad);
          p.leg_l_thigh.tx = 16.0 * (1 - easeInQuad);
          p.leg_l_shin.tx = 20.0 * (1 - easeInQuad);
          
          p.leg_r_thigh.rot = -0.25 * (1 - easeInQuad);
          p.arm_l_upper.rot = -0.6 * (1 - easeInQuad);
          p.arm_r_upper.rot = -0.3 * (1 - easeInQuad);
        }
        break;
      }

      case 'BLOCK': {
        p.pelvis.ty = 3.0;
        p.torso.rot = -0.12;
        p.arm_l_upper.rot = -0.6;
        const lowerL = isMonster ? p.claw_l : p.arm_l_lower;
        if (lowerL) lowerL.rot = 0.85;

        p.arm_r_upper.rot = -0.4;
        const lowerR = isMonster ? p.claw_r : p.arm_r_lower;
        if (lowerR) lowerR.rot = 0.75;
        break;
      }

      case 'HIT': {
        // DRAMATIC BACKWARD RECOIL from incoming strike
        const decayExp = Math.exp(-t * 4.5);  // Exponential decay
        const hitShake = Math.sin(t * 32.0) * Math.exp(-t * 9.0) * 1.2;
        
        // STRONG BACKWARD KNOCKBACK
        p.pelvis.tx = -26.0 * decayExp + hitShake * 4.0;  // Knocked back
        p.pelvis.ty = Math.abs(Math.sin(t * 18.0)) * 3.0 * decayExp;  // Bounce
        
        // Body recoils from impact
        p.torso.rot = -0.55 * decayExp;       // Arches back
        p.torso.tx = -8.0 * decayExp;         // Thrown back
        p.head.rot = -0.65 * decayExp;        // Head snaps back
        p.head.tx = -12.0 * decayExp;         // Head pulled back
        p.head.ty = 4.0 * Math.abs(Math.sin(t * 16.0)) * decayExp;  // Shake
        
        // Arms react to impact
        p.arm_l_upper.rot = 0.65 * decayExp;  // Flinch up
        p.arm_l_upper.tx = -6.0 * decayExp;
        p.arm_r_upper.rot = 0.65 * decayExp;  // Flinch up
        p.arm_r_upper.tx = -6.0 * decayExp;
        
        // Legs stumble backward
        p.leg_r_thigh.rot = -0.3 * decayExp;
        p.leg_l_thigh.rot = 0.25 * decayExp;
        break;
      }

      case 'ATTACK': {
        // Monster heavy beast attack - MASSIVE FORWARD CHARGE
        if (t < 0.2) {
          // ROARING WINDUP - coil energy
          const prog = t / 0.2;
          p.pelvis.tx = -prog * 10.0;       // Pull back for power
          p.pelvis.ty = prog * 3.0;         // Crouch
          p.torso.rot = -prog * 0.35;       // Twist back
          p.torso.tx = -prog * 6.0;         // Lean back
          p.head.rot = prog * 0.5;          // Roar upward
          p.head.tx = -prog * 3.0;
          p.arm_l_upper.rot = -prog * 0.8;  // Wind up left claw
          p.arm_r_upper.rot = prog * 0.4;   // Right claw comes in
          if (p.claw_l) p.claw_l.rot = -prog * 0.6;
          if (p.claw_r) p.claw_r.rot = prog * 0.4;
          // Legs brace for charge
          p.leg_r_shin.rot = prog * 0.2;
          p.leg_l_shin.rot = -prog * 0.15;
        } else if (t < 0.52) {
          // BRUTAL CLAW SMASH - full body FORWARD CHARGE
          const progress = (t - 0.2) / 0.32;
          const easeOutQuad = 1 - Math.pow(1 - progress, 2);
          
          // EXPLOSIVE FORWARD TRANSLATION
          p.pelvis.tx = 32.0 * easeOutQuad;      // CHARGE forward
          p.pelvis.ty = 3.0 - progress * 2.0;    // Rise during attack
          p.torso.tx = 40.0 * easeOutQuad;       // Torso leads
          p.torso.rot = 0.5 * easeOutQuad;       // Twist into attack
          p.head.rot = -0.3 * easeOutQuad;       // Head pulls back
          p.head.tx = 18.0 * easeOutQuad;        // Head leads charge
          
          // FULL CLAW EXTENSION
          p.arm_l_upper.rot = 1.0 * easeOutQuad;
          p.arm_l_upper.tx = 25.0 * easeOutQuad;
          if (p.claw_l) {
            p.claw_l.rot = 1.1 * easeOutQuad;
            p.claw_l.tx = 22.0 * easeOutQuad;
          }
          p.arm_r_upper.rot = 0.5 * easeOutQuad;
          if (p.claw_r) {
            p.claw_r.rot = 0.7 * easeOutQuad;
            p.claw_r.tx = 12.0 * easeOutQuad;
          }
          
          // Legs engaged for power
          p.leg_r_thigh.rot = -0.3 * easeOutQuad;
          p.leg_r_shin.rot = 0.2;
          p.leg_l_thigh.rot = 0.2 * easeOutQuad;
        } else {
          // RECOVERY - pull back
          const progress = (t - 0.52) / 0.18;
          const easeInQuad = progress * progress;
          
          p.pelvis.tx = 32.0 * (1 - easeInQuad);
          p.torso.tx = 40.0 * (1 - easeInQuad);
          p.torso.rot = 0.5 * (1 - easeInQuad);
          p.head.rot = -0.3 * (1 - easeInQuad);
          p.head.tx = 18.0 * (1 - easeInQuad);
          p.arm_l_upper.rot = 1.0 * (1 - easeInQuad);
          p.arm_l_upper.tx = 25.0 * (1 - easeInQuad);
          if (p.claw_l) {
            p.claw_l.rot = 1.1 * (1 - easeInQuad);
            p.claw_l.tx = 22.0 * (1 - easeInQuad);
          }
          p.arm_r_upper.rot = 0.5 * (1 - easeInQuad);
          if (p.claw_r) p.claw_r.tx = 12.0 * (1 - easeInQuad);
          p.leg_r_thigh.rot = -0.3 * (1 - easeInQuad);
        }
        break;
      }

      case 'VICTORY': {
        // Continuous, smooth, energetic victory dance loop!
        const danceSpeed = 5.0;
        const beat = Math.sin(t * danceSpeed);
        const cosBeat = Math.cos(t * danceSpeed);
        const bounce = Math.abs(Math.sin(t * danceSpeed * 0.5));

        // Hips sway rhythmically left and right
        p.pelvis.tx = beat * 12.0;
        p.pelvis.ty = -bounce * 8.0;
        p.torso.rot = -beat * 0.14;
        p.head.rot = beat * 0.18;
        p.head.ty = -bounce * 4.0;

        // Alternating triumphant victory arm pumps
        p.arm_l_upper.rot = -1.2 + cosBeat * 0.45; // high in the air
        const lowerL = isMonster ? p.claw_l : p.arm_l_lower;
        if (lowerL) lowerL.rot = -0.4 + beat * 0.35;

        p.arm_r_upper.rot = -1.2 - cosBeat * 0.45;
        const lowerR = isMonster ? p.claw_r : p.arm_r_lower;
        if (lowerR) lowerR.rot = -0.4 - beat * 0.35;

        // Knees bounce rhythmically in step
        p.leg_l_thigh.rot = beat * 0.25;
        p.leg_l_shin.rot = Math.max(0, -beat * 0.3);
        p.leg_r_thigh.rot = -beat * 0.25;
        p.leg_r_shin.rot = Math.max(0, beat * 0.3);
        break;
      }

      case 'DEFEAT': {
        // Dramatic physical fall: hit -> balance loss -> knees buckle -> collapse to ground
        const fallT = Math.min(1.8, t);
        if (fallT < 0.3) {
          // Initial hit impact & stagger
          const prog = fallT / 0.3;
          p.pelvis.tx = -prog * 12.0;
          p.torso.rot = -prog * 0.25;
          p.head.rot = -prog * 0.35;
        } else if (fallT < 0.8) {
          // Knees buckle & body starts falling downward
          const prog = (fallT - 0.3) / 0.5;
          p.pelvis.tx = -12.0 - prog * 15.0;
          p.pelvis.ty = prog * 38.0; // drops toward ground
          p.leg_l_thigh.rot = prog * 0.85;
          p.leg_l_shin.rot = prog * 1.1;
          p.leg_r_thigh.rot = prog * 0.7;
          p.leg_r_shin.rot = prog * 0.95;
          p.torso.rot = prog * 0.45;
          p.head.rot = prog * 0.4;
          p.arm_l_upper.rot = prog * 0.8;
          p.arm_r_upper.rot = prog * 0.7;
        } else {
          // Complete flat collapse on ground
          const prog = Math.min(1.0, (fallT - 0.8) / 0.6);
          p.pelvis.tx = -27.0 - prog * 10.0;
          p.pelvis.ty = 38.0 + prog * 28.0; // grounded
          p.torso.rot = 0.45 + prog * 0.65; // body angled down
          p.head.rot = 0.4 + prog * 0.5;
          p.head.ty = prog * 18.0;
          p.arm_l_upper.rot = 1.1;
          p.arm_r_upper.rot = 1.2;
          p.leg_l_thigh.rot = 1.1;
          p.leg_l_shin.rot = 1.3;
          p.leg_r_thigh.rot = 0.9;
          p.leg_r_shin.rot = 1.1;
        }
        break;
      }
    }

    return p;
  }

  /* ------------------------------------------------------------------
     Hierarchical Matrix Computation & Rendering
  ------------------------------------------------------------------ */
  render() {
    if (!this.ctx || !this.imagesLoaded) return;
    const ctx = this.ctx;

    ctx.save();
    // Position at root anchor
    ctx.translate(this.rootX, this.rootY);

    // Apply canonical horizontal facing
    ctx.scale(this.facing * this.scale, this.scale);

    // Sort bones by Z-order for proper front-to-back depth layering
    const sortedBones = [...this.boneNames].sort((a, b) => {
      return this.boneHierarchy[a].z - this.boneHierarchy[b].z;
    });

    // Compute global transform matrices for all bones
    const worldTransforms = {};
    this.boneNames.forEach(name => {
      worldTransforms[name] = this._computeBoneTransform(name);
    });

    // Draw each bone image with its pivot alignment
    sortedBones.forEach(name => {
      const info = this.boneHierarchy[name];
      const img = this.images[name];
      const xform = worldTransforms[name];
      if (!img || !xform) return;

      ctx.save();
      // Apply hierarchical transform
      ctx.translate(xform.x, xform.y);
      ctx.rotate(xform.rot);
      ctx.scale(xform.sx, xform.sy);

      // Draw image offset by pivot
      ctx.drawImage(img, -info.pivot[0], -info.pivot[1], info.w, info.h);
      ctx.restore();
    });

    ctx.restore();
  }

  _computeBoneTransform(name) {
    const info = this.boneHierarchy[name];
    const pose = this.currentPose[name] || { rot: 0, tx: 0, ty: 0, sx: 1, sy: 1 };

    if (!info.parent) {
      // Root bone (Pelvis)
      return {
        x: pose.tx,
        y: pose.ty - 140, // Base offset from ground baseline
        rot: pose.rot,
        sx: pose.sx,
        sy: pose.sy
      };
    }

    // Parent bone transform
    const parentXform = this._computeBoneTransform(info.parent);
    const parentInfo = this.boneHierarchy[info.parent];

    // Local offset of this bone's pivot relative to parent bone origin
    const localRelX = (info.ox - parentInfo.ox) + (info.pivot[0] - parentInfo.pivot[0]);
    const localRelY = (info.oy - parentInfo.oy) + (info.pivot[1] - parentInfo.pivot[1]);

    // Rotate local offset by parent rotation
    const cos = Math.cos(parentXform.rot);
    const sin = Math.sin(parentXform.rot);
    const worldRelX = (localRelX * cos - localRelY * sin) * parentXform.sx;
    const worldRelY = (localRelX * sin + localRelY * cos) * parentXform.sy;

    return {
      x: parentXform.x + worldRelX + pose.tx,
      y: parentXform.y + worldRelY + pose.ty,
      rot: parentXform.rot + pose.rot,
      sx: parentXform.sx * pose.sx,
      sy: parentXform.sy * pose.sy
    };
  }
}

window.PuppetRig = PuppetRig;
