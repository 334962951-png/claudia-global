use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::process::Command;
use tauri::{AppHandle, Manager, State};

use crate::commands::agents::AgentDb;

static LITELLM_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LiteLLMStatus {
    pub running: bool,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderOption {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub api_key_label: String,
    pub base_url_hint: Option<String>,
    pub protocol: String,
}

// Built-in providers
fn built_in_providers() -> Vec<ProviderOption> {
    vec![
        ProviderOption {
            id: "anthropic".into(),
            name: "Anthropic 官方".into(),
            icon: "🤖".into(),
            api_key_label: "ANTHROPIC_API_KEY".into(),
            base_url_hint: None,
            protocol: "anthropic".into(),
        },
        ProviderOption {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            icon: "🌐".into(),
            api_key_label: "OPENAI_API_KEY".into(),
            base_url_hint: Some("https://openrouter.ai/api/v1".into()),
            protocol: "openai".into(),
        },
        ProviderOption {
            id: "deepseek".into(),
            name: "DeepSeek".into(),
            icon: "🔵".into(),
            api_key_label: "OPENAI_API_KEY".into(),
            base_url_hint: Some("https://api.deepseek.com".into()),
            protocol: "openai".into(),
        },
        ProviderOption {
            id: "siliconflow".into(),
            name: "硅基流动 SiliconFlow".into(),
            icon: "💧".into(),
            api_key_label: "OPENAI_API_KEY".into(),
            base_url_hint: Some("https://api.siliconflow.cn/v1".into()),
            protocol: "openai".into(),
        },
        ProviderOption {
            id: "zhipuai".into(),
            name: "智谱 GLM".into(),
            icon: "📊".into(),
            api_key_label: "ZHIPUAI_API_KEY".into(),
            base_url_hint: Some("https://open.bigmodel.cn/api/paas/v4".into()),
            protocol: "openai".into(),
        },
        ProviderOption {
            id: "dashscope".into(),
            name: "阿里云通义千问".into(),
            icon: "☁️".into(),
            api_key_label: "DASHSCOPE_API_KEY".into(),
            base_url_hint: Some("https://dashscope.aliyuncs.com/compatible-mode/v1".into()),
            protocol: "openai".into(),
        },
        ProviderOption {
            id: "gemini".into(),
            name: "Google Gemini".into(),
            icon: "✨".into(),
            api_key_label: "GOOGLE_API_KEY".into(),
            base_url_hint: Some("https://generativelanguage.googleapis.com".into()),
            protocol: "openai".into(),
        },
    ]
}

#[tauri::command]
pub async fn get_providers() -> Result<Vec<ProviderOption>, String> {
    Ok(built_in_providers())
}

#[tauri::command]
pub async fn get_provider_config(db: State<'_, AgentDb>) -> Result<ProviderConfig, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let id = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'provider_id'",
        [],
        |row| row.get::<_, String>(0),
    ).unwrap_or_else(|_| "anthropic".into());

    let name = built_in_providers()
        .iter()
        .find(|p| p.id == id)
        .map(|p| p.name.clone())
        .unwrap_or_else(|| "Anthropic 官方".into());

    // API key is encrypted in DB - return masked version for display
    let api_key_masked = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'provider_api_key'",
        [],
        |row| row.get::<_, String>(0),
    ).ok().map(|k| {
        if k.is_empty() || k == "***" { String::new() }
        else { "••••••••".to_string() }
    });

    let base_url = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'provider_base_url'",
        [],
        |row| row.get::<_, String>(0),
    ).ok().filter(|s| !s.is_empty());

    Ok(ProviderConfig {
        id,
        name,
        api_key: api_key_masked,
        base_url,
    })
}

#[tauri::command]
pub async fn save_provider_config(
    db: State<'_, AgentDb>,
    provider_id: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let settings = vec![
        ("provider_id", provider_id.clone()),
        ("provider_api_key", if api_key.is_empty() { String::new() } else { api_key }),
        ("provider_base_url", base_url.clone().unwrap_or_default()),
    ];

    for (key, value) in settings {
        conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        ).map_err(|e| format!("Failed to save {}: {}", key, e))?;
    }

    log::info!("Provider config saved: {}", provider_id);
    Ok(())
}

#[tauri::command]
pub async fn get_litellm_status() -> Result<LiteLLMStatus, String> {
    Ok(LiteLLMStatus {
        running: LITELLM_RUNNING.load(Ordering::SeqCst),
        port: 8000,
    })
}

#[tauri::command]
pub async fn start_litellm(_app: AppHandle, api_key: String, port: u16) -> Result<(), String> {
    if LITELLM_RUNNING.load(Ordering::SeqCst) {
        return Ok(());
    }

    // Try the fixed path first, fall back to PATH
    let litellm_path = std::path::Path::new("/mnt/d/ai-env/bin/litellm-proxy");
    let litellm_executable = if litellm_path.exists() {
        litellm_path
    } else {
        std::path::Path::new("litellm-proxy")
    };

    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("claudia");
    std::fs::create_dir_all(&config_dir).ok();
    let config_path = config_dir.join("litellm_config.yaml");

    // Generate minimal litellm config
    let config = format!(r#"model_list:
  - model_name: claude-3-5-sonnet
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: "{}"
litellm_settings:
  drop_params: true
  set_verbose: true
"#, api_key);
    std::fs::write(&config_path, config).map_err(|e| e.to_string())?;

    let mut cmd = Command::new(litellm_executable);
    cmd.arg("--port").arg(port.to_string())
       .arg("--config").arg(&config_path)
       .arg("--host").arg("127.0.0.1");

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    tokio::spawn(async move {
        if let Err(e) = cmd.spawn() {
            log::error!("Failed to start LiteLLM: {}", e);
            LITELLM_RUNNING.store(false, Ordering::SeqCst);
            return;
        }
        LITELLM_RUNNING.store(true, Ordering::SeqCst);
        log::info!("LiteLLM proxy started on port {}", port);
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_litellm() -> Result<(), String> {
    LITELLM_RUNNING.store(false, Ordering::SeqCst);
    // Try to kill litellm-proxy process
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("taskkill")
            .args(["/F", "/IM", "litellm-proxy.exe"])
            .output()
            .ok();
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("pkill")
            .arg("-f")
            .arg("litellm-proxy")
            .output()
            .ok();
    }
    log::info!("LiteLLM proxy stopped");
    Ok(())
}

/// Get active provider config for env var injection (internal use)
/// Called from claude.rs — uses AppHandle to access the db state
pub fn get_active_provider_env(app: &AppHandle) -> Result<std::collections::HashMap<String, String>, String> {
    let db_state = app.state::<AgentDb>();
    let conn: std::sync::MutexGuard<'_, Connection> = db_state.0.lock().map_err(|e| e.to_string())?;

    let provider_id: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'provider_id'",
        [],
        |row| row.get::<_, String>(0),
    ).unwrap_or_else(|_| "anthropic".into());

    let api_key: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'provider_api_key'",
        [],
        |row| row.get::<_, String>(0),
    ).unwrap_or_default();

    let base_url: Option<String> = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'provider_base_url'",
        [],
        |row| row.get::<_, String>(0),
    ).ok().filter(|s| !s.is_empty());

    let mut env_vars = std::collections::HashMap::new();

    match provider_id.as_str() {
        "anthropic" => {
            if !api_key.is_empty() {
                env_vars.insert("ANTHROPIC_API_KEY".into(), api_key);
            }
        }
        "litellm" => {
            env_vars.insert("ANTHROPIC_BASE_URL".into(), "http://localhost:8000".into());
            if !api_key.is_empty() {
                env_vars.insert("ANTHROPIC_API_KEY".into(), api_key);
            }
        }
        _ => {
            // Third-party OpenAI-compatible providers
            if !api_key.is_empty() {
                env_vars.insert("OPENAI_API_KEY".into(), api_key);
            }
            if let Some(url) = base_url {
                env_vars.insert("OPENAI_BASE_URL".into(), url);
            }
        }
    }

    Ok(env_vars)
}
