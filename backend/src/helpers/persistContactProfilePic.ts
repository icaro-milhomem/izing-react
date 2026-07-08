import fs from "fs";
import path from "path";
import axios from "axios";
import { logger } from "../utils/logger";
import buildBackendPublicUrl from "./buildBackendPublicUrl";

export const persistContactProfilePic = async (
  tenantId: string | number,
  number: string,
  sourceUrl?: string | null
): Promise<string | undefined> => {
  if (!sourceUrl) return undefined;

  if (!sourceUrl.startsWith("http")) {
    return sourceUrl;
  }

  const safeNumber = String(number).replace(/\D/g, "") || "unknown";
  const relativePath = `contacts/t${tenantId}/${safeNumber}.jpg`;
  const absoluteDir = path.resolve(
    __dirname,
    "..",
    "..",
    "public",
    "contacts",
    `t${tenantId}`
  );
  const absoluteFile = path.join(absoluteDir, `${safeNumber}.jpg`);

  try {
    await fs.promises.mkdir(absoluteDir, { recursive: true });
    const response = await axios.get(sourceUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
      maxRedirects: 5
    });

    if (!response.data || response.data.byteLength < 100) {
      return undefined;
    }

    await fs.promises.writeFile(absoluteFile, response.data);
    return buildBackendPublicUrl(relativePath);
  } catch (error) {
    logger.warn(
      `persistContactProfilePic failed tenant=${tenantId} number=${safeNumber}: ${error}`
    );
    return sourceUrl;
  }
};

export default persistContactProfilePic;
