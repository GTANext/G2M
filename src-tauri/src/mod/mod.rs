pub mod config;
pub mod core;
pub mod utils;

// 只重新导出核心安装函数，其他工具函数不导出（避免冲突）
pub use core::install_user_mod;
// utils 中的函数是内部使用的，不需要导出

