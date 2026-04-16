// Export/Load 커맨드
// 프런트엔드는 네이티브 다이얼로그를 plugin-dialog에서 직접 호출하므로,
// 이 모듈은 파일 I/O만 담당한다.
use std::fs;
use std::path::Path;

/// 지정 경로에 문자열을 저장한다. 상위 디렉터리가 없으면 생성한다.
#[tauri::command]
pub fn save_export(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(p, content).map_err(|e| e.to_string())
}

/// 지정 경로의 문자열 파일을 읽어 반환한다.
#[tauri::command]
pub fn load_document(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}
