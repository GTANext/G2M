use std::fs;
use std::path::Path;

/// 检查文件是否为贴图或模型文件
pub fn is_texture_or_model_file(file_path: &Path) -> bool {
    if let Some(ext) = file_path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        // 贴图文件扩展名
        if matches!(
            ext_lower.as_str(),
            "txd" | "dds" | "png" | "jpg" | "jpeg" | "bmp" | "tga"
        ) {
            return true;
        }
        // 模型文件扩展名
        if matches!(ext_lower.as_str(), "dff" | "col" | "ifp" | "anm") {
            return true;
        }
    }
    false
}

/// 检查目录是否包含贴图或模型文件
pub fn is_texture_or_model_directory(dir_path: &Path) -> bool {
    if !dir_path.is_dir() {
        return false;
    }

    // 检查目录名
    if let Some(dir_name) = dir_path.file_name() {
        let dir_name_lower = dir_name.to_string_lossy().to_lowercase();
        if matches!(
            dir_name_lower.as_str(),
            "models" | "textures" | "txd" | "dff" | "img" | "gta3" | "gta_vc" | "gta_sa"
        ) {
            return true;
        }
    }

    // 检查目录中是否包含贴图或模型文件
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && is_texture_or_model_file(&path) {
                return true;
            }
            // 递归检查子目录（限制深度）
            if path.is_dir() {
                if is_texture_or_model_directory(&path) {
                    return true;
                }
            }
        }
    }

    false
}

/// 检查路径是否是另一个路径的子路径（规范化比较）
fn is_subpath_of(path: &Path, parent: &Path) -> bool {
    // 尝试规范化路径
    let path_canonical = path.canonicalize().ok();
    let parent_canonical = parent.canonicalize().ok();
    
    if let (Some(p), Some(par)) = (path_canonical, parent_canonical) {
        return p.starts_with(&par);
    }
    
    // 如果规范化失败，使用字符串比较（不区分大小写）
    let path_str = path.to_string_lossy().to_lowercase();
    let parent_str = parent.to_string_lossy().to_lowercase();
    path_str.starts_with(&parent_str)
}

/// 递归复制目录
pub fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    // 检查源路径和目标路径是否相同
    if is_subpath_of(dst, src) && is_subpath_of(src, dst) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("源路径和目标路径相同或会导致循环复制: {} -> {}", src.display(), dst.display())
        ));
    }
    
    // 检查目标路径是否是源路径的子目录（会导致无限递归）
    if is_subpath_of(dst, src) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("目标路径是源路径的子目录，会导致无限递归: {} -> {}", src.display(), dst.display())
        ));
    }
    
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let ty = entry.file_type()?;
        if ty.is_dir() {
            let dst_entry = dst.join(entry.file_name());
            // 再次检查，防止递归复制到自身
            if !is_subpath_of(&dst_entry, &entry_path) {
                copy_dir_all(&entry_path, &dst_entry)?;
            }
        } else {
            fs::copy(&entry_path, dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

