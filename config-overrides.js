module.exports = function override(config) {
    config.module.rules.forEach((rule) => {
      if (rule.use && rule.use.some((u) => u.loader && u.loader.includes('source-map-loader'))) {
        // Thêm node_modules/@solana/buffer-layout và superstruct vào exclude
        rule.exclude = [
          ...(rule.exclude || []),
          /node_modules\/@solana\/buffer-layout/,
          /node_modules\/superstruct/,
        ];
      }
    });
    return config;
  };
  