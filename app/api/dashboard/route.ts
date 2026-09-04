import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { priceRecords, products, promotionTags } from "../../../db/schema";
const number = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export async function GET() {
  try {
    const db = getDb();
    return Response.json({
      products: await db.select().from(products).orderBy(desc(products.id)),
      priceRecords: await db.select().from(priceRecords).orderBy(desc(priceRecords.recordedAt), desc(priceRecords.id)),
      promotionTags: await db.select().from(promotionTags).orderBy(asc(promotionTags.name)),
    });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取数据失败" }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const { type, payload: p = {} } = await request.json() as { type?: string; payload?: Record<string, unknown> };
    const db = getDb();
    if (type === "product" || type === "updateProduct") {
      const id = Number(p.id), name = String(p.name ?? "").trim(), quantity = Number(p.quantity);
      if (!name || !Number.isFinite(quantity) || quantity <= 0) return Response.json({ error: "请填写商品名称和有效规格" }, { status: 400 });
      const values = { name, brand:String(p.brand??"").trim(), category:String(p.category??"其他").trim()||"其他", quantity, unit:String(p.unit??"g"), protein:number(p.protein), fat:number(p.fat), saturatedFat:number(p.saturatedFat), carbohydrate:number(p.carbohydrate), sugar:number(p.sugar), fiber:number(p.fiber), sodium:number(p.sodium), energy:number(p.energy), targetUnitPrice:p.targetUnitPrice ? number(p.targetUnitPrice) : null };
      const product = type === "product" ? await db.insert(products).values(values).returning() : await db.update(products).set(values).where(eq(products.id,id)).returning();
      return Response.json({ product: product[0] }, { status: type === "product" ? 201 : 200 });
    }
    if (type === "price" || type === "updatePrice") {
      const id=Number(p.id), price=Number(p.price); if (!Number.isFinite(price)||price<=0) return Response.json({error:"请填写有效价格"},{status:400});
      const values={price,priceType:String(p.priceType??"促销价"),promotionTag:String(p.promotionTag??""),store:String(p.store??""),recordedAt:String(p.recordedAt??new Date().toISOString().slice(0,10)),note:String(p.note??"")};
      const record=type==="price" ? await db.insert(priceRecords).values({...values,productId:Number(p.productId)}).returning() : await db.update(priceRecords).set(values).where(eq(priceRecords.id,id)).returning();
      return Response.json({record:record[0]},{status:type==="price"?201:200});
    }
    if (type === "tag") { const name=String(p.name??"").trim(); if (!name) return Response.json({error:"请输入活动名称"},{status:400}); const tag=await db.insert(promotionTags).values({name}).onConflictDoNothing().returning(); return Response.json({tag:tag[0]},{status:201}); }
    return Response.json({error:"未知操作"},{status:400});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"保存失败"},{status:500}); }
}