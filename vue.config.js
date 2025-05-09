const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  // Disable file watching for local development to avoid ENOSPC errors
  lintOnSave: false,
  devServer: {
    client: {
      overlay: true,
      progress: true
    }
  }
})
