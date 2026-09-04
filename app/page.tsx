"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/static-components */
import { FormEvent, useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  quantity: number;
  unit: string;
  protein: number;
  fat: number;
  saturatedFat: number;
  carbohydrate: number;
  sugar: number;
  fiber: number;
  sodium: number;
  energy: number;
  targetTotalPrice: number | null;
};

type PriceRecord = {
  id: number;
  productId: number;
  totalPrice: number;
  priceType: string;
  promotionTag: string;
  platform: string;
  store: string;
  recordedAt: string;
  note: string;
};

type Data = {
  products: Product[];
  priceRecords: PriceRecord[];
  promotionTags: { id: number; name: string; color: string }[];
};

const today = new Date().toISOString().slice(0, 10);
const fmt = (v: number) => v.toFixed(2);

// 营养成分显示顺序
const NUTRITION_ORDER = [
  { key: "energy", label: "能量", unit: "kJ" },
  { key: "protein", label: "蛋白质", unit: "g" },
  { key: "fat", label: "脂肪", unit: "g" },
  { key: "saturatedFat", label: "饱和脂肪", unit: "g" },
  { key: "carbohydrate", label: "碳水化合物", unit: "g" },
  { key: "sugar", label: "糖", unit: "g" },
  { key: "fiber", label: "膳食纤维", unit: "g" },
  { key: "sodium", label: "钠", unit: "mg" },
];

// 计算单位价格（每100g/ml）
const calcUnitPrice = (totalPrice: number, product: Product) => {
  if (product.unit === "g" || product.unit === "ml") {
    return (totalPrice / product.quantity) * 100;
  }
  return totalPrice / product.quantity;
};

const unitLabel = (u: string) => {
  if (u === "g") return "元/100g";
  if (u === "ml") return "元/100ml";
  return `元/${u}`;
};

const PLATFORMS = ["淘宝", "抖音", "拼多多", "京东", "美团", "饿了么", "线下超市", "其他"];

export default function Home() {
  const [data, setData] = useState<Data>({
    products: [],
    priceRecords: [],
    promotionTags: [],
  });
  const [active, setActive] = useState<"overview" | "products" | "prices" | "compare">("overview");
  const [selected, setSelected] = useState<number[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingPrice, setEditingPrice] = useState<PriceRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/dashboard", { cache: "no-store" });
    const x = await r.json();
    if (!r.ok) setError("数据库正在准备中。");
    else setData(x);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const recordsByProduct = useMemo(() => {
    const m = new Map<number, PriceRecord[]>();
    data.priceRecords.forEach((r) =>
      m.set(r.productId, [...(m.get(r.productId) ?? []), r])
    );
    m.forEach((a) =>
      a.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id - a.id)
    );
    return m;
  }, [data.priceRecords]);

  const evaluations = useMemo(
    () =>
      data.products.map((product) => {
        const records = recordsByProduct.get(product.id) ?? [];
        const current = records[0];

        const unitPrices = records.map((r) => calcUnitPrice(r.totalPrice, product));
        const currentUnit = current ? calcUnitPrice(current.totalPrice, product) : null;
        const min = unitPrices.length ? Math.min(...unitPrices) : null;
        const avg = unitPrices.length
          ? unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length
          : null;

        let status = "待记录";
        if (
          currentUnit !== null &&
          product.targetTotalPrice !== null &&
          currentUnit <= calcUnitPrice(product.targetTotalPrice, product)
        ) {
          status = "好价";
        } else if (
          currentUnit !== null &&
          min !== null &&
          unitPrices.length >= 3 &&
          currentUnit <= min * 1.05
        ) {
          status = "超值";
        } else if (
          currentUnit !== null &&
          avg !== null &&
          unitPrices.length >= 3 &&
          currentUnit <= avg * 0.85
        ) {
          status = "好价";
        } else if (currentUnit !== null) {
          status = unitPrices.length < 3 ? "样本不足" : currentUnit > (avg ?? currentUnit) * 1.1 ? "偏贵" : "正常";
        }

        return { product, current, currentUnit, min, avg, status };
      }),
    [data.products, recordsByProduct]
  );

  const submit = async (type: string, payload: Record<string, unknown>) => {
    setError("");
    const r = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
    const x = await r.json();
    if (!r.ok) {
      setError(x.error ?? "保存失败");
      return false;
    }
    await load();
    return true;
  };

  function ProductForm({ product = null }: { product?: Product | null }) {
    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const payload: Record<string, unknown> = {
        name: formData.get("name"),
        brand: formData.get("brand"),
        category: formData.get("category"),
        quantity: parseFloat(formData.get("quantity") as string),
        unit: formData.get("unit"),
        protein: parseFloat(formData.get("protein") as string) || 0,
        fat: parseFloat(formData.get("fat") as string) || 0,
        saturatedFat: parseFloat(formData.get("saturatedFat") as string) || 0,
        carbohydrate: parseFloat(formData.get("carbohydrate") as string) || 0,
        sugar: parseFloat(formData.get("sugar") as string) || 0,
        fiber: parseFloat(formData.get("fiber") as string) || 0,
        sodium: parseFloat(formData.get("sodium") as string) || 0,
        energy: parseFloat(formData.get("energy") as string) || 0,
        targetTotalPrice: formData.get("targetTotalPrice")
          ? parseFloat(formData.get("targetTotalPrice") as string)
          : null,
      };
      if (product) payload.id = product.id;
      const ok = await submit(product ? "updateProduct" : "product", payload);
      if (ok) {
        e.currentTarget.reset();
        setEditingProduct(null);
      }
    };

    return (
      <form className="entry-grid" onSubmit={onSubmit}>
        <input name="name" required defaultValue={product?.name} placeholder="商品名称" />
        <input name="brand" defaultValue={product?.brand} placeholder="品牌" />
        <input name="category" defaultValue={product?.category} placeholder="分类" />
        <div className="two-col">
          <input
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={product?.quantity}
            placeholder="总规格"
          />
          <select name="unit" defaultValue={product?.unit ?? "g"}>
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="件">件</option>
          </select>
        </div>
        {NUTRITION_ORDER.map(({ key, label, unit }) => (
          <input
            key={key}
            name={key}
            type="number"
            min="0"
            step="0.1"
            defaultValue={(product?.[key as keyof Product] as number) || ""}
            placeholder={`${label} (${unit}/100g)`}
          />
        ))}
        <input
          name="targetTotalPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={product?.targetTotalPrice ?? ""}
          placeholder="目标总价（元）"
        />
        <button className="primary" type="submit">
          {product ? "保存修改" : "保存商品"}
        </button>
        {product && (
          <button type="button" onClick={() => setEditingProduct(null)}>
            取消编辑
          </button>
        )}
      </form>
    );
  }

  function PriceForm({ record = null }: { record?: PriceRecord | null }) {
    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const payload: Record<string, unknown> = {
        productId: parseInt(formData.get("productId") as string),
        totalPrice: parseFloat(formData.get("totalPrice") as string),
        priceType: formData.get("priceType"),
        promotionTag: formData.get("promotionTag"),
        platform: formData.get("platform"),
        store: formData.get("store"),
        recordedAt: formData.get("recordedAt"),
        note: formData.get("note"),
      };
      if (record) payload.id = record.id;
      const ok = await submit(record ? "updatePrice" : "price", payload);
      if (ok) {
        e.currentTarget.reset();
        setEditingPrice(null);
      }
    };

    return (
      <form className="entry-grid" onSubmit={onSubmit}>
        <select
          name="productId"
          required
          defaultValue={record?.productId ?? ""}
          disabled={!!record}
        >
          <option value="" disabled>
            选择商品
          </option>
          {data.products.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name} · {p.quantity}
              {p.unit}
            </option>
          ))}
        </select>
        <input
          name="totalPrice"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={record?.totalPrice}
          placeholder="商品总价（元）"
        />
        <select name="priceType" defaultValue={record?.priceType ?? "促销价"}>
          <option>促销价</option>
          <option>官方价</option>
          <option>日常价</option>
        </select>
        <select name="promotionTag" defaultValue={record?.promotionTag ?? ""}>
          <option value="">无活动</option>
          {data.promotionTags.map((t) => (
            <option key={t.id}>{t.name}</option>
          ))}
        </select>
        <select name="platform" defaultValue={record?.platform ?? "其他"}>
          {PLATFORMS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input name="store" defaultValue={record?.store} placeholder="渠道/店铺名" />
        <input
          name="recordedAt"
          type="date"
          defaultValue={record?.recordedAt ?? today}
        />
        <input className="wide" name="note" defaultValue={record?.note} placeholder="备注" />
        <button className="primary" type="submit" disabled={!data.products.length}>
          {record ? "保存修改" : "记录价格"}
        </button>
        {record && (
          <button type="button" onClick={() => setEditingPrice(null)}>
            取消编辑
          </button>
        )}
      </form>
    );
  }

  const TagForm = () => (
    <form
      className="tag-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (await submit("tag", { name: f.get("name") })) e.currentTarget.reset();
      }}
    >
      <input name="name" required placeholder="新增活动，如：双11" />
      <button type="submit">添加</button>
    </form>
  );

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">PERSONAL TRACKER</p>
          <h1>营养与价格记录</h1>
        </div>
        <div className="today">{today}</div>
      </header>

      <nav>
        {(
          [
            ["overview", "概览"],
            ["products", "商品"],
            ["prices", "价格记录"],
            ["compare", "营养对比"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={active === key ? "nav-active" : ""}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="notice">{error}</p>}

      {loading ? (
        <p>正在读取记录…</p>
      ) : (
        <>
          {active === "overview" && (
            <section className="content">
              <div className="summary">
                <article>
                  <span>已登记商品</span>
                  <strong>{data.products.length}</strong>
                </article>
                <article>
                  <span>价格记录</span>
                  <strong>{data.priceRecords.length}</strong>
                </article>
                <article>
                  <span>当前好价</span>
                  <strong>
                    {evaluations.filter((x) => x.status === "好价" || x.status === "超值").length}
                  </strong>
                </article>
              </div>

              <div className="section-heading">
                <div>
                  <p className="eyebrow">CURRENT PRICE</p>
                  <h2>当前价格判断</h2>
                </div>
              </div>

              {!evaluations.length ? (
                <Empty />
              ) : (
                <div className="cards">
                  {evaluations.map(({ product, current, currentUnit, min, avg, status }) => (
                    <article className="price-card" key={product.id}>
                      <span className={`status ${status}`}>{status}</span>
                      <button
                        className="select-button"
                        onClick={() =>
                          setSelected((s) =>
                            s.includes(product.id)
                              ? s.filter((id) => id !== product.id)
                              : [...s, product.id]
                          )
                        }
                      >
                        {selected.includes(product.id) ? "已选对比" : "加入对比"}
                      </button>
                      <h3>{product.name}</h3>
                      <p className="muted">
                        {product.brand || "未填写品牌"} · {product.quantity}
                        {product.unit}
                      </p>
                      <strong className="price">
                        {current ? `¥${fmt(current.totalPrice)}` : "暂无价格"}
                      </strong>
                      <p className="unit">
                        {currentUnit !== null
                          ? `${fmt(currentUnit)} ${unitLabel(product.unit)}`
                          : "录入价格后自动计算"}
                      </p>
                      {product.targetTotalPrice && (
                        <p className="muted" style={{ fontSize: "0.78rem" }}>
                          目标好价: ¥{fmt(product.targetTotalPrice)}
                        </p>
                      )}
                      <dl>
                        <div>
                          <dt>历史最低</dt>
                          <dd>{min === null ? "—" : `${fmt(min)} ${unitLabel(product.unit)}`}</dd>
                        </div>
                        <div>
                          <dt>历史均价</dt>
                          <dd>{avg === null ? "—" : `${fmt(avg)} ${unitLabel(product.unit)}`}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {active === "products" && (
            <section className="content split">
              <div>
                <h2>{editingProduct ? "编辑商品" : "登记商品"}</h2>
                <ProductForm product={editingProduct} />
              </div>
              <div className="panel">
                <h3>已登记商品</h3>
                <div className="record-list">
                  {data.products.map((p) => (
                    <div key={p.id}>
                      <strong>{p.name}</strong>
                      <span>
                        {p.brand || "未填写品牌"} · {p.quantity}
                        {p.unit}
                        {p.targetTotalPrice && ` · 目标价 ¥${fmt(p.targetTotalPrice)}`}
                      </span>
                      <button onClick={() => setEditingProduct(p)}>编辑</button>
                    </div>
                  ))}
                </div>
                <h3>促销活动标签</h3>
                <TagForm />
              </div>
            </section>
          )}

          {active === "prices" && (
            <section className="content split">
              <div>
                <h2>{editingPrice ? "编辑价格记录" : "新增价格记录"}</h2>
                <PriceForm record={editingPrice} />
              </div>
              <div className="panel">
                <h3>最近记录</h3>
                <div className="record-list">
                  {data.priceRecords.slice(0, 8).map((r) => {
                    const p = data.products.find((x) => x.id === r.productId);
                    return (
                      <div key={r.id}>
                        <strong>{p?.name ?? "商品"}</strong>
                        <span>
                          ¥{fmt(r.totalPrice)} · {r.priceType} {r.promotionTag && `· ${r.promotionTag}`}
                        </span>
                        <small>
                          {r.recordedAt} · {r.platform} {r.store && `· ${r.store}`}
                        </small>
                        <button onClick={() => setEditingPrice(r)}>编辑</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {active === "compare" && (
            <section className="content">
              <div className="section-heading">
                <div>
                  <h2>营养与单位价对比</h2>
                  <p className="muted" style={{ marginTop: "4px" }}>
                    已选 {selected.length} 件商品
                  </p>
                </div>
                {selected.length > 0 && (
                  <button className="clear-btn" onClick={() => setSelected([])}>
                    清空选择
                  </button>
                )}
              </div>

              {selected.length < 2 ? (
                <Empty text="在「概览」页面点击「加入对比」至少选择两件商品，即可比较营养和当前单位价格。" />
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>商品</th>
                        <th>规格</th>
                        {NUTRITION_ORDER.map(({ key, label, unit }) => (
                          <th key={key}>
                            {label}
                            <span className="unit-label">/{unit}</span>
                          </th>
                        ))}
                        <th>当前单位价</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations
                        .filter((x) => selected.includes(x.product.id))
                        .map(({ product, currentUnit }) => {
                          const isBest = (key: string) => {
                            const values = evaluations
                              .filter((x) => selected.includes(x.product.id))
                              .map((x) => x.product[key as keyof Product] as number);
                            const max = Math.max(...values);
                            const min = Math.min(...values);
                            const val = product[key as keyof Product] as number;
                            const lowIsGood = ["energy", "fat", "saturatedFat", "sugar", "sodium"].includes(key);
                            return lowIsGood ? val === min : val === max;
                          };

                          return (
                            <tr key={product.id}>
                              <td>
                                <strong>{product.name}</strong>
                                <span className="muted">{product.brand || ""}</span>
                              </td>
                              <td>
                                {product.quantity}
                                {product.unit}
                              </td>
                              {NUTRITION_ORDER.map(({ key }) => {
                                const val = (product[key as keyof Product] as number) || 0;
                                const best = isBest(key);
                                return (
                                  <td key={key} className={best ? "best-value" : ""}>
                                    {val.toFixed(1)}
                                    {best && <span className="best-badge">★</span>}
                                  </td>
                                );
                              })}
                              <td className="price-cell">
                                {currentUnit === null
                                  ? "—"
                                  : `${fmt(currentUnit)} ${unitLabel(product.unit)}`}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Empty({ text = "先在「商品」页面登记一个商品，再记录它的官方价或促销价。" }: { text?: string }) {
  return (
    <div className="empty">
      <strong>还没有可展示的数据</strong>
      <p>{text}</p>
    </div>
  );
}
