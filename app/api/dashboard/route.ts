import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/libsql";
import { products, priceRecords, promotionTags } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client);

export async function GET() {
  try {
    const [allProducts, allPriceRecords, allPromotionTags] = await Promise.all([
      db.select().from(products).orderBy(products.name),
      db.select().from(priceRecords).orderBy(desc(priceRecords.recordedAt)),
      db.select().from(promotionTags),
    ]);

    return NextResponse.json({
      products: allProducts,
      priceRecords: allPriceRecords,
      promotionTags: allPromotionTags,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "数据库连接失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, payload } = await request.json();

    switch (type) {
      case "product": {
        const result = await db.insert(products).values(payload).returning();
        return NextResponse.json({ success: true, data: result });
      }
      case "updateProduct": {
        const { id, ...data } = payload;
        await db.update(products).set(data).where(eq(products.id, id as number));
        return NextResponse.json({ success: true });
      }
      case "price": {
        const result = await db.insert(priceRecords).values(payload).returning();
        return NextResponse.json({ success: true, data: result });
      }
      case "updatePrice": {
        const { id, ...data } = payload;
        await db.update(priceRecords).set(data).where(eq(priceRecords.id, id as number));
        return NextResponse.json({ success: true });
      }
      case "tag": {
        const result = await db.insert(promotionTags).values({
          name: payload.name as string,
        }).returning();
        return NextResponse.json({ success: true, data: result });
      }
      default:
        return NextResponse.json({ error: "未知操作类型" }, { status: 400 });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
