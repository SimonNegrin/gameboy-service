import express from 'express'
import expressWs from 'express-ws'
import { config as loadEnv } from 'dotenv'

loadEnv()

const port = Number.parseInt(process.env.PORT)
const app = express()
const emulators = new Map()
const PACKET_GAMEPAD_CONNECTED = 1
const PACKET_GAMEPAD_DISCONNECTED = 2

expressWs(app)

app.ws('/emulator/:emuId', (ws, req) => {
  const { emuId } = req.params

  if (!emuId || emulators.has(emuId)) {
    ws.close()
    return
  }

  emulators.set(emuId, ws)
  ws.on('close', () => {
    console.log(`Emulator "${emuId}" has disconnected`)
    emulators.delete(emuId)
  })

  console.log(`Registered emulator with id "${emuId}"`)
})

app.ws('/gamepad/:emuId', (ws, req) => {
  const { emuId } = req.params
  let allowConnect = true

  if (!emuId) {
    console.log('Gamepad try to connect but emuId is not provided')
    allowConnect = false
  } else if (!emulators.has(emuId)) {
    console.log(`Gamepad try to connect but emulator "${emuId}" doesn't exists`)
    allowConnect = false
  }

  if (!allowConnect) {
    ws.close()
    return
  }

  const emulatorWs = emulators.get(emuId)

  ws.on('message', data => emulatorWs.send(data))
  ws.on('close', () => {
    emulatorWs.send(createPacket([PACKET_GAMEPAD_DISCONNECTED]))
    console.log(`Controller for emulator "${emuId}" has disconnected`)
  })

  emulatorWs.send(createPacket([PACKET_GAMEPAD_CONNECTED]))
  console.log(`Registered controller for emulator "${emuId}"`)
})

app.listen(port, () => {
  console.log(`GameBoy service is running on port ${port}`)
})

const createPacket = (bytes) => {
  const data = new Uint8Array(bytes.length)
  bytes.forEach((byte, i) => {
    data[i] = byte
  })
  return data
}
