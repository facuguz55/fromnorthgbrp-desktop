use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        if let Ok(updater) = handle.updater() {
          if let Ok(Some(update)) = updater.check().await {
            let _ = update.download_and_install(|_chunk: usize, _total: Option<u64>| {}, || {}).await;
          }
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
