// npm install --save chromadb chromadb-default-embed

import { ChromaClient } from "chromadb";
const client = new ChromaClient({
  path: "https://api.trychroma.com:8000",
  auth: { provider: "token", credentials: 'ck-AkHGxbWpiFsm644Nukb5xtXTxoTeyVSRL6zLPX9xL5UJ', tokenHeaderType: "X_CHROMA_TOKEN" },
  tenant: 'efc48a9b-2ec2-40f6-8c6a-b43c810db1a2',
  database: 'auto-crm-mvp-ai'
});

const collection = await client.getOrCreateCollection({ name: "fruit" });
await collection.add({
  ids: ["1", "2", "3"],
  documents: ["apple", "oranges", "pineapple"],
});
console.log(await collection.query({ queryTexts: "hawaii", nResults: 1 }));
  