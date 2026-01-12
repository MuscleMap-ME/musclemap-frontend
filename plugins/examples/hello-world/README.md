# Hello World Plugin

A minimal example plugin demonstrating the MuscleMap plugin system.

## Features

- **Dashboard Widget**: Adds an interactive greeting widget to the dashboard
- **Custom Page**: Provides a dedicated plugin page at `/plugins/hello`
- **Event Handling**: Shows how to subscribe to app events
- **Hook Integration**: Demonstrates filter hook usage

## Installation

This plugin is included as a built-in example. To use it as a template for your own plugin:

```bash
# Copy the plugin to your workspace
cp -r plugins/examples/hello-world plugins/my-plugin

# Update the plugin.json with your plugin details
```

## Structure

```
hello-world/
├── plugin.json          # Plugin manifest
├── frontend/
│   └── index.jsx        # Frontend entry point
└── README.md            # This file
```

## Plugin Manifest

The `plugin.json` file defines:

- **id**: Unique plugin identifier
- **name**: Display name
- **version**: Semantic version
- **description**: Brief description
- **entry.frontend**: Path to frontend entry point
- **contributes.widgets**: Widget registrations
- **contributes.routes**: Route registrations
- **permissions**: Required permissions
- **capabilities**: Plugin capabilities

## Frontend Entry Point

The frontend entry exports:

- **onLoad(ctx)**: Called when plugin loads, receives plugin context
- **onUnload()**: Called when plugin unloads
- **widgets**: Map of widget components (lazy-loaded)
- **routes**: Map of route components (lazy-loaded)

## Plugin Context

The `ctx` object provides:

```javascript
{
  pluginId: string,           // Unique plugin ID
  config: object,             // Plugin configuration
  api: PluginApiClient,       // API client
  navigate: (path) => void,   // Navigation function
  on: (event, handler) => (), // Event subscription
  emit: (event, payload) => , // Event emission
  addFilter: (name, fn) => () // Register filter hook
  addAction: (name, fn) => () // Register action hook
}
```

## Development

1. Make changes to the plugin files
2. The plugin will hot-reload in development mode
3. Test your changes in the browser

## Learn More

- [Plugin Development Guide](../../../docs/PLUGIN-DEVELOPMENT.md)
- [Plugin Manifest Reference](../../../docs/PLUGIN-MANIFEST.md)
- [Widget Slots Reference](../../../docs/WIDGET-SLOTS.md)
