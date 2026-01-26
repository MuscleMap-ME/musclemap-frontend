//! Template rendering engine

use std::collections::HashMap;
use regex::Regex;

use super::{BuildTemplate, TemplateError};

/// Template context for variable substitution
#[derive(Debug, Clone, Default)]
pub struct TemplateContext {
    /// Variables available for substitution
    pub variables: HashMap<String, String>,
}

impl TemplateContext {
    /// Create a new template context
    pub fn new() -> Self {
        Self {
            variables: HashMap::new(),
        }
    }

    /// Add a variable
    pub fn set(&mut self, key: &str, value: &str) -> &mut Self {
        self.variables.insert(key.to_string(), value.to_string());
        self
    }

    /// Get a variable
    pub fn get(&self, key: &str) -> Option<&str> {
        self.variables.get(key).map(|s| s.as_str())
    }

    /// Create context for a package build
    pub fn for_package(package: &str, hash: &str) -> Self {
        let mut ctx = Self::new();
        ctx.set("package", package);
        ctx.set("hash", hash);
        ctx.set("timestamp", &chrono::Utc::now().timestamp().to_string());
        ctx
    }
}

/// Template rendering engine
pub struct TemplateEngine {
    /// Variable pattern (e.g., {{ variable }})
    var_pattern: Regex,
    /// Conditional pattern (e.g., {% if condition %}...{% endif %})
    cond_pattern: Regex,
    /// Loop pattern (e.g., {% for item in list %}...{% endfor %})
    loop_pattern: Regex,
}

impl TemplateEngine {
    /// Create a new template engine
    pub fn new() -> Self {
        Self {
            var_pattern: Regex::new(r"\{\{\s*(\w+)\s*\}\}").unwrap(),
            cond_pattern: Regex::new(r"\{%\s*if\s+(\w+)\s*%\}(.*?)\{%\s*endif\s*%\}").unwrap(),
            loop_pattern: Regex::new(r"\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}(.*?)\{%\s*endfor\s*%\}").unwrap(),
        }
    }

    /// Render a string with variable substitution
    pub fn render(&self, template: &str, context: &TemplateContext) -> Result<String, TemplateError> {
        let mut result = template.to_string();

        // Process conditionals first
        result = self.process_conditionals(&result, context)?;

        // Process variables
        result = self.process_variables(&result, context)?;

        Ok(result)
    }

    /// Process variable substitutions
    fn process_variables(&self, template: &str, context: &TemplateContext) -> Result<String, TemplateError> {
        let mut result = template.to_string();

        for cap in self.var_pattern.captures_iter(template) {
            let full_match = cap.get(0).unwrap().as_str();
            let var_name = cap.get(1).unwrap().as_str();

            let value = context.get(var_name)
                .ok_or_else(|| TemplateError::Render(format!("Variable '{}' not found", var_name)))?;

            result = result.replace(full_match, value);
        }

        Ok(result)
    }

    /// Process conditional blocks
    fn process_conditionals(&self, template: &str, context: &TemplateContext) -> Result<String, TemplateError> {
        let mut result = template.to_string();

        // Simple truthy check for now
        for cap in self.cond_pattern.captures_iter(template) {
            let full_match = cap.get(0).unwrap().as_str();
            let var_name = cap.get(1).unwrap().as_str();
            let content = cap.get(2).unwrap().as_str();

            let should_include = context.get(var_name)
                .map(|v| !v.is_empty() && v != "false" && v != "0")
                .unwrap_or(false);

            let replacement = if should_include { content } else { "" };
            result = result.replace(full_match, replacement);
        }

        Ok(result)
    }

    /// Render a build template
    pub fn render_template(&self, template: &BuildTemplate, context: &TemplateContext) -> Result<RenderedTemplate, TemplateError> {
        // Render command
        let command = self.render(&template.build.command, context)?;

        // Render environment variables
        let mut env = HashMap::new();
        for (key, value) in &template.env {
            env.insert(key.clone(), self.render(value, context)?);
        }

        // Render cache key
        let cache_key = self.render(&template.build.cache.key, context)?;

        // Render pre-build steps
        let pre_build: Result<Vec<_>, _> = template.pre_build.iter()
            .map(|step| {
                Ok(RenderedStep {
                    name: step.name.clone(),
                    command: self.render(&step.command, context)?,
                    cwd: self.render(&step.cwd, context)?,
                    continue_on_error: step.continue_on_error,
                })
            })
            .collect();

        // Render post-build steps
        let post_build: Result<Vec<_>, _> = template.post_build.iter()
            .map(|step| {
                Ok(RenderedStep {
                    name: step.name.clone(),
                    command: self.render(&step.command, context)?,
                    cwd: self.render(&step.cwd, context)?,
                    continue_on_error: step.continue_on_error,
                })
            })
            .collect();

        Ok(RenderedTemplate {
            id: template.id.clone(),
            command,
            cwd: template.build.cwd.clone(),
            env,
            timeout_secs: template.build.timeout_secs,
            cache_key,
            cache_paths: template.build.cache.paths.clone(),
            outputs: template.build.outputs.clone(),
            inputs: template.build.inputs.clone(),
            pre_build: pre_build?,
            post_build: post_build?,
        })
    }

    /// Validate a template string has valid syntax
    pub fn validate_syntax(&self, template: &str) -> Result<(), TemplateError> {
        // Check for balanced {{ }}
        let open_var = template.matches("{{").count();
        let close_var = template.matches("}}").count();
        if open_var != close_var {
            return Err(TemplateError::Parse("Unbalanced {{ }} in template".into()));
        }

        // Check for balanced {% %}
        let open_tag = template.matches("{%").count();
        let close_tag = template.matches("%}").count();
        if open_tag != close_tag {
            return Err(TemplateError::Parse("Unbalanced {% %} in template".into()));
        }

        // Check for matching if/endif
        let if_count = template.matches("{% if").count();
        let endif_count = template.matches("{% endif").count();
        if if_count != endif_count {
            return Err(TemplateError::Parse("Mismatched if/endif blocks".into()));
        }

        // Check for matching for/endfor
        let for_count = template.matches("{% for").count();
        let endfor_count = template.matches("{% endfor").count();
        if for_count != endfor_count {
            return Err(TemplateError::Parse("Mismatched for/endfor blocks".into()));
        }

        Ok(())
    }
}

impl Default for TemplateEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Rendered template ready for execution
#[derive(Debug, Clone)]
pub struct RenderedTemplate {
    /// Template ID
    pub id: String,
    /// Rendered build command
    pub command: String,
    /// Working directory
    pub cwd: String,
    /// Rendered environment variables
    pub env: HashMap<String, String>,
    /// Timeout in seconds
    pub timeout_secs: u64,
    /// Rendered cache key
    pub cache_key: String,
    /// Cache paths
    pub cache_paths: Vec<String>,
    /// Output patterns
    pub outputs: Vec<String>,
    /// Input patterns
    pub inputs: Vec<String>,
    /// Pre-build steps
    pub pre_build: Vec<RenderedStep>,
    /// Post-build steps
    pub post_build: Vec<RenderedStep>,
}

/// Rendered build step
#[derive(Debug, Clone)]
pub struct RenderedStep {
    /// Step name
    pub name: String,
    /// Rendered command
    pub command: String,
    /// Working directory
    pub cwd: String,
    /// Continue on error
    pub continue_on_error: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_variable_substitution() {
        let engine = TemplateEngine::new();
        let mut ctx = TemplateContext::new();
        ctx.set("name", "test");
        ctx.set("version", "1.0");

        let result = engine.render("Hello {{ name }} v{{ version }}", &ctx).unwrap();
        assert_eq!(result, "Hello test v1.0");
    }

    #[test]
    fn test_conditional() {
        let engine = TemplateEngine::new();
        let mut ctx = TemplateContext::new();
        ctx.set("debug", "true");

        let result = engine.render("{% if debug %}DEBUG{% endif %}", &ctx).unwrap();
        assert_eq!(result, "DEBUG");

        ctx.set("debug", "false");
        let result = engine.render("{% if debug %}DEBUG{% endif %}", &ctx).unwrap();
        assert_eq!(result, "");
    }

    #[test]
    fn test_syntax_validation() {
        let engine = TemplateEngine::new();

        assert!(engine.validate_syntax("{{ var }}").is_ok());
        assert!(engine.validate_syntax("{% if x %}{% endif %}").is_ok());
        assert!(engine.validate_syntax("{{ unclosed").is_err());
        assert!(engine.validate_syntax("{% if x %}").is_err());
    }
}
