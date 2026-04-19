import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./index.css";
// 노드 타입 레지스트리 초기화 — 각 kind 모듈이 register()로 자신을 등록
import "./nodes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
