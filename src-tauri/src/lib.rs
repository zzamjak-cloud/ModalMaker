// Tauri 앱 런타임 구성
// - 플러그인: dialog(파일 저장 다이얼로그), fs(파일 읽기/쓰기)
// - 커맨드: commands 모듈에 등록
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::fs_export::save_export,
            commands::fs_export::load_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ModalMaker");
}
