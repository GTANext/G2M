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

/// 递归复制目录
pub fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

