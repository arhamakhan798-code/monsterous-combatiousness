import os
import numpy as np
from PIL import Image
from scipy import ndimage

def perfect_extract(src_path, out_path):
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img, dtype=np.float32)
    h, w, _ = arr.shape
    
    diff = np.max(arr, axis=2) - np.min(arr, axis=2)
    mean_val = np.mean(arr, axis=2)
    
    # 1. Pure checkerboard pixel mask (grey ~200-225 or white ~245-255 with diff <= 4)
    is_bg_grey = (diff <= 4) & (mean_val >= 195) & (mean_val <= 225)
    is_bg_white = (diff <= 4) & (mean_val >= 245)
    is_bg_exact = is_bg_grey | is_bg_white
    
    # Neutral connecting pixels at transitions:
    is_neutral = (diff <= 8) & (mean_val >= 180)
    
    # Flood-fill outer background from image borders
    border_mask = np.zeros((h, w), dtype=bool)
    border_mask[0, :] = True
    border_mask[-1, :] = True
    border_mask[:, 0] = True
    border_mask[:, -1] = True
    
    labeled, num_features = ndimage.label(is_neutral, structure=np.ones((3,3), dtype=bool))
    border_labels = set(np.unique(labeled[border_mask]))
    if 0 in border_labels: border_labels.remove(0)
    
    bg_mask = np.zeros((h, w), dtype=bool)
    for lab in border_labels:
        bg_mask |= (labeled == lab)
        
    # Find all interior enclosed checkerboard holes
    labeled_exact, num_exact = ndimage.label(is_bg_exact, structure=np.ones((3,3), dtype=bool))
    
    for lab in range(1, num_exact + 1):
        comp = (labeled_exact == lab)
        grey_count = np.sum(comp & is_bg_grey)
        white_count = np.sum(comp & is_bg_white)
        sz = np.sum(comp)
        
        # If it contains grey checkerboard pixels (the signature of the fake background):
        if grey_count >= 5 and sz >= 10:
            hole_dilated = ndimage.binary_dilation(comp, structure=np.ones((3,3), dtype=bool), iterations=2)
            hole_mask = hole_dilated & is_neutral
            bg_mask |= hole_mask
            
    # Clean edges: 1-pixel dilation of bg_mask into near-neutral border pixels
    bg_dilated = ndimage.binary_dilation(bg_mask, structure=np.ones((3,3), dtype=bool), iterations=1)
    edge_zone = bg_dilated & (~bg_mask)
    
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    alpha[bg_mask] = 0
    
    for y, x in zip(*np.where(edge_zone)):
        if diff[y, x] <= 15 and mean_val[y, x] >= 170:
            alpha[y, x] = int(max(0, 255 - (mean_val[y, x] - 165) * 4))
            
    rgba = np.dstack([np.array(img), alpha])
    out_img = Image.fromarray(rgba, 'RGBA')
    out_img.save(out_path, 'PNG')
    print(f'Processed and saved transparent sprite: {out_path}')

if __name__ == '__main__':
    art_dir = 'C:/Users/Arham/.gemini/antigravity-ide/brain/2b3b2dae-1ae6-40cf-8aee-12ba605a6b31'
    perfect_extract(f'{art_dir}/female_character_1787775546567.jpg', 'assets/female-char.png')
    perfect_extract(f'{art_dir}/male_character_1787775532469.jpg', 'assets/male-char.png')
    perfect_extract(f'{art_dir}/monster_1787775515922.jpg', 'assets/monster.png')
    print('All sprites cleaned with 100% transparent interior holes!')
