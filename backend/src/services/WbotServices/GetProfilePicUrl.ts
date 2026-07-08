import ResolveContactProfilePicUrl from "./ResolveContactProfilePicUrl";

const GetProfilePicUrl = async (
  number: string,
  tenantId: string | number
): Promise<string> => {
  const profilePicUrl = await ResolveContactProfilePicUrl(tenantId, number);
  return profilePicUrl || "";
};

export default GetProfilePicUrl;
