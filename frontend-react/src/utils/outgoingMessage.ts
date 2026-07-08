import type { Message } from '@/types/entities'
import { frontId } from '@/utils/uuid'

function newMessageFrontId() {
  return frontId()
}

export function serializeQuotedMessage(message?: Message | null) {
  if (!message?.id) return undefined

  return {
    id: message.id,
    body: message.body,
    fromMe: message.fromMe,
    mediaType: message.mediaType,
    messageId: message.messageId
  }
}

export function buildOutgoingTextPayload(body: string, replyingMessage?: Message | null) {
  const id = newMessageFrontId()
  const payload: Record<string, unknown> = {
    read: 1,
    fromMe: true,
    mediaUrl: '',
    body,
    id,
    idFront: id
  }

  const quotedMsg = serializeQuotedMessage(replyingMessage)
  if (quotedMsg) payload.quotedMsg = quotedMsg

  return payload
}

export function appendOutgoingFormFields(
  formData: FormData,
  replyingMessage?: Message | null
) {
  const id = newMessageFrontId()
  formData.append('fromMe', 'true')
  formData.append('id', id)
  formData.append('idFront', id)

  const quotedMsg = serializeQuotedMessage(replyingMessage)
  if (quotedMsg) {
    formData.append('quotedMsg', JSON.stringify(quotedMsg))
  }
}
