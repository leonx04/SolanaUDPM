module.exports = {
    presets: [
      ['@babel/preset-env', {
        targets: {
          node: 'current',
          browsers: ['>0.2%', 'not dead', 'not op_mini all']
        }
      }],
      '@babel/preset-react'
    ],
    plugins: [
      '@babel/plugin-proposal-logical-assignment-operators'
    ]
  }