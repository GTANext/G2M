/**
 * POW 验证码求解 Worker
 * 在后台线程中计算 SHA-256 哈希，找到满足难度要求的 nonce
 */

interface WorkerMessage {
  challenge: string
  difficulty: number
}

interface WorkerResult {
  challenge: string
  nonce: number
  hash: string
}

self.onmessage = async function (e: MessageEvent<WorkerMessage>) {
  const { challenge, difficulty } = e.data
  const prefix = '0'.repeat(difficulty)
  let nonce = 0

  while (true) {
    const msgUint8 = new TextEncoder().encode(challenge + nonce)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (hashHex.startsWith(prefix)) {
      const result: WorkerResult = {
        challenge,
        nonce,
        hash: hashHex
      }
      self.postMessage(result)
      break
    }
    nonce++
  }
}
