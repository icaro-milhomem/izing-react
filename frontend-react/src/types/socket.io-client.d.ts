declare module 'socket.io-client' {
  import { Socket as ClientSocket } from 'socket.io-client/build/index'
  export type Socket = ClientSocket
  export default function io(uri: string, opts?: Record<string, unknown>): ClientSocket
  export { io }
}
