// ModalMaker 데스크톱 엔트리포인트
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    modalmaker_lib::run()
}
