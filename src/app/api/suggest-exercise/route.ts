import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış" },
        { status: 500 }
      );
    }

    const client = new Anthropic();
    const { excessCalories } = await req.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Günlük kalori limitimi ${excessCalories} kalori aştım. Bu fazla kaloriyi yakmak için egzersiz önerileri ver.

Yanıtını SADECE aşağıdaki JSON formatında ver:
{
  "exercises": [
    {
      "name": "egzersiz adı",
      "duration": "süre (dakika)",
      "caloriesBurned": yakılacak kalori,
      "intensity": "düşük" | "orta" | "yüksek",
      "description": "kısa açıklama"
    }
  ],
  "message": "motivasyon mesajı"
}

En az 3, en fazla 5 egzersiz öner. Farklı yoğunluklarda olsun.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Öneri oluşturulamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Egzersiz önerisi hatası:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "API anahtarı geçersiz. Lütfen ayarları kontrol edin." },
          { status: 500 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin." },
          { status: 429 }
        );
      }
      if (error.status === 529) {
        return NextResponse.json(
          { error: "AI servisi şu anda meşgul. Lütfen birkaç dakika sonra tekrar deneyin." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: `AI servisi hatası (${error.status}). Lütfen daha sonra tekrar deneyin.` },
        { status: error.status || 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI yanıtı işlenemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
