import fs from 'fs'
import path from 'path'
import express from 'express'
import { auth } from './middleware/auth'

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

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = () => {
    const timestamp = new Date().toLocaleTimeString()
    const data = { message: 'Hello from server', timestamp }
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  sendEvent()
  const intervalId = setInterval(sendEvent, 1000)

  req.on('close', () => {
    clearInterval(intervalId)
    res.end()
  })
})

app.get('/download', (req, res) => {
  const filePath = path.join(__dirname, 'example.txt')
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', 'attachment; filename="example.txt"')
  fs.createReadStream(filePath).pipe(res)
})

router.get('/config', auth, async (req, res) => {
  res.send({
    code: '200',
    data: 'Hello!',
  })
})

app.use('', router)
app.use('/api', router)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
