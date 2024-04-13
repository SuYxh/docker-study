// 使用 Node.js 的 fs（文件系统）模块来写文件
const fs = require('fs')
const path = require('path')

// 从环境变量中读取 MODEL 值
const model = process.env.MODEL

// 创建 env 文件的内容
const content = `MODEL=${model}`

// 写入 env 文件
fs.writeFile(path.join(__dirname, 'env'), content, (err) => {
  if (err) {
    console.error('Failed to write env file:', err)
    process.exit(1)
  }
  else {
    console.log('env file written successfully')
  }
})
