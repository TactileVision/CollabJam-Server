import pino from "pino"
import PinoPretty from "pino-pretty"

export const Logger = pino({
  level: 'trace',
  transport: {

    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
})

Logger.info('hi')