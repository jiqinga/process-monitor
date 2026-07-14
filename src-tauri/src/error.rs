use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("mutex poisoned: {0}")]
    Lock(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("invalid input: {0}")]
    Invalid(String),

    #[error("os api error: {0}")]
    OsApi(String),

    #[error("{0}")]
    Other(String),
}

impl AppError {
    pub fn not_found<S: Into<String>>(msg: S) -> Self {
        AppError::NotFound(msg.into())
    }

    pub fn invalid<S: Into<String>>(msg: S) -> Self {
        AppError::Invalid(msg.into())
    }

    pub fn os_api<S: Into<String>>(msg: S) -> Self {
        AppError::OsApi(msg.into())
    }

    #[allow(dead_code)]
    pub fn other<S: Into<String>>(msg: S) -> Self {
        AppError::Other(msg.into())
    }

    pub fn lock_from<E: std::fmt::Display>(e: E) -> Self {
        AppError::Lock(e.to_string())
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Other(s)
    }
}

impl From<&str> for AppError {
    fn from(s: &str) -> Self {
        AppError::Other(s.to_string())
    }
}

impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(e: std::sync::PoisonError<T>) -> Self {
        AppError::Lock(e.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
