import fs from 'fs'
import path from 'path'
import express from 'express'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

// 确保日志文件夹存在
// const logDirectory = '/Users/yangxinhao/Desktop/docker-study/logs'
const logDirectory = '/usr/src/app/logs'
const logFilename = path.join(logDirectory, 'access.log')
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true })
}

// 简单的请求日志功能
app.use((req, res, next) => {
  const log = `${new Date().toISOString()} - ${req.method} ${req.originalUrl}\n`
  fs.appendFileSync(`${logDirectory}/access.log`, log)
  next()
})

app.get('/', (req, res) => {
  res.send('Hello, Docker!')
})

app.get('/logs', (req, res) => {
  fs.readFile(logFilename, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the log file:', err)
      return res.status(500).send('Unable to read log file')
    }
    res.send(data)
  })
})

router.get('/config', async (req, res) => {
  const BASE_URL = process.env.BASE_URL
  const MODEL = process.env.MODEL
  const API_KEY = process.env.API_KEY
  const TOKEN = process.env.TOKEN

  res.send({
    code: '200',
    data: {
      common: 'common',
      BASE_URL,
      MODEL,
      API_KEY,
      TOKEN,
    },
  })
})

app.use('', router)
app.use('/api', router)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
