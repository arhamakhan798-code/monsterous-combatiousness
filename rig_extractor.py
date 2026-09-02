import os
import numpy as np
from PIL import Image

def create_dirs():
    os.makedirs('assets/rigs/male', exist_ok=True)
    os.makedirs('assets/rigs/female', exist_ok=True)
    os.makedirs('assets/rigs/monster', exist_ok=True)

def crop_and_pad(img_arr, y1, y2, x1, x2, pad=6):
    h, w, _ = img_arr.shape
    y1_p = max(0, y1 - pad)
    y2_p = min(h, y2 + pad)
    x1_p = max(0, x1 - pad)
    x2_p = min(w, x2 + pad)
    
    part = np.zeros((h, w, 4), dtype=np.uint8)
    part[y1_p:y2_p, x1_p:x2_p] = img_arr[y1_p:y2_p, x1_p:x2_p]
    
    # Trim to minimal bounding box of non-zero alpha
    alpha = part[:, :, 3]
    if not np.any(alpha > 10):
        return None, (0, 0)
    
    ys, xs = np.where(alpha > 10)
    min_y, max_y = ys.min(), ys.max() + 1
    min_x, max_x = xs.min(), xs.max() + 1
    
    trimmed = part[min_y:max_y, min_x:max_x]
    return Image.fromarray(trimmed, 'RGBA'), (min_x, min_y)

def extract_male_rig():
    im = Image.open('assets/male-char.png').convert('RGBA')
    arr = np.array(im)
    cuts = {
        'head': (0, 110, 95, 240),
        'torso': (90, 195, 80, 255),
        'pelvis': (175, 235, 95, 245),
        'arm_l_upper': (95, 170, 215, 315),
        'arm_l_lower': (150, 245, 240, 341),
        'arm_r_upper': (95, 170, 25, 125),
        'arm_r_lower': (150, 245, 0, 100),
        'leg_l_thigh': (200, 275, 165, 265),
        'leg_l_shin': (250, 318, 175, 270),
        'foot_l': (295, 333, 175, 285),
        'leg_r_thigh': (200, 275, 75, 175),
        'leg_r_shin': (250, 318, 70, 165),
        'foot_r': (295, 333, 55, 165),
    }

    for name, (y1, y2, x1, x2) in cuts.items():
        part_img, (ox, oy) = crop_and_pad(arr, y1, y2, x1, x2, pad=6)
        if part_img:
            path = f'assets/rigs/male/{name}.png'
            part_img.save(path)
            print(f'Saved Male part: {name} ({part_img.width}x{part_img.height}) at ({ox}, {oy})')

def extract_female_rig():
    im = Image.open('assets/female-char.png').convert('RGBA')
    arr = np.array(im)
    cuts = {
        'head': (0, 105, 95, 235),
        'torso': (90, 185, 85, 245),
        'pelvis': (168, 228, 95, 235),
        'arm_l_upper': (95, 168, 210, 305),
        'arm_l_lower': (148, 240, 230, 329),
        'arm_r_upper': (95, 168, 25, 120),
        'arm_r_lower': (148, 240, 0, 100),
        'leg_l_thigh': (195, 270, 160, 255),
        'leg_l_shin': (248, 315, 165, 260),
        'foot_l': (292, 332, 165, 275),
        'leg_r_thigh': (195, 270, 75, 170),
        'leg_r_shin': (248, 315, 70, 160),
        'foot_r': (292, 332, 55, 160),
    }

    for name, (y1, y2, x1, x2) in cuts.items():
        part_img, (ox, oy) = crop_and_pad(arr, y1, y2, x1, x2, pad=6)
        if part_img:
            path = f'assets/rigs/female/{name}.png'
            part_img.save(path)
            print(f'Saved Female part: {name} ({part_img.width}x{part_img.height}) at ({ox}, {oy})')

def extract_monster_rig():
    im = Image.open('assets/monster.png').convert('RGBA')
    arr = np.array(im)
    cuts = {
        'head': (60, 390, 280, 740),
        'torso': (340, 680, 240, 780),
        'pelvis': (600, 780, 280, 740),
        'arm_l_upper': (320, 560, 680, 998),
        'claw_l': (500, 840, 720, 998),
        'arm_r_upper': (320, 560, 50, 360),
        'claw_r': (500, 840, 50, 320),
        'leg_l_thigh': (680, 880, 560, 880),
        'leg_l_shin': (820, 1010, 580, 940),
        'leg_r_thigh': (680, 880, 140, 460),
        'leg_r_shin': (820, 1010, 90, 440),
    }

    for name, (y1, y2, x1, x2) in cuts.items():
        part_img, (ox, oy) = crop_and_pad(arr, y1, y2, x1, x2, pad=10)
        if part_img:
            path = f'assets/rigs/monster/{name}.png'
            part_img.save(path)
            print(f'Saved Monster part: {name} ({part_img.width}x{part_img.height}) at ({ox}, {oy})')

if __name__ == '__main__':
    create_dirs()
    extract_male_rig()
    extract_female_rig()
    extract_monster_rig()
    print('All puppet rig parts cleanly extracted!')
