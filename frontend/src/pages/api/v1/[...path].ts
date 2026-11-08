import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: { bodyParser: false, externalResolver: true, responseLimit: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { handleApiRequest } = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */
    "rc-premier-backend/serverless"
  );
  await handleApiRequest(req, res);
}
