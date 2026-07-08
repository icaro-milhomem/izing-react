import Contact from "../../../models/Contact";
import CreateOrUpdateContactService from "../../ContactServices/CreateOrUpdateContactService";

const VerifyContactWuzapi = async (
  number: string,
  name: string,
  tenantId: string | number,
  isGroup: boolean = false
): Promise<Contact> => {
  const contactData = {
    name: name || number,
    number: number,
    profilePicUrl: undefined, // WUZAPI não fornece profilePicUrl diretamente no webhook
    tenantId,
    pushname: name,
    isUser: true, // Assumir que é usuário, pode ser ajustado conforme necessário
    isWAContact: true,
    isGroup: isGroup
  };

  const contact = await CreateOrUpdateContactService(contactData);

  return contact;
};

export default VerifyContactWuzapi;

