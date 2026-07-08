import Message from "../../models/Message";

const isMessageExistsService = async (msg: {
  id?: { id?: string };
}): Promise<boolean> => {
  const messageId = msg?.id?.id;
  if (!messageId) return false;

  const message = await Message.findOne({
    where: { messageId }
  });

  return Boolean(message);
};

export default isMessageExistsService;
