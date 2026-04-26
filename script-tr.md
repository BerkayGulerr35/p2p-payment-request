# P2P Payment Request — Türkçe Çeviri Notları

Video kaydı sırasında ingilizce okunan script'in türkçe karşılıkları. Her step kendi başlığı altında.

---

## Step 0 — Intro (Giriş)

Herkese merhaba, ben Berkay Güler — İzmir'de yaşayan bir developer'ım. Bu videoda bir fintech şirketinin take-home interview assignment'ı olarak bir P2P payment request — yani peer-to-peer ödeme talebi — uygulaması geliştireceğim.

Fikir basit: bir kullanıcı, başka bir kullanıcıya ödeme talebi gönderiyor, miktarı ve kısa bir notu belirtiyor; alıcı (recipient) bu talebi ya ödüyor ya da reddediyor. Gönderici (sender), talep hâlâ "pending" durumdayken iptal edebiliyor, ve cevaplanmayan her talep yedi gün sonra otomatik olarak "expired" hâline geçiyor. Video boyunca tüm süreci — spec'ten deploy'a kadar — adım adım anlatacağım, böylece nasıl düşündüğümü ve nerelerde trade-off yaptığımı görebileceksiniz.

Stack tarafında: frontend'de Next.js 15 App Router, TypeScript, Tailwind CSS ve shadcn/ui; backend'de ise Supabase — veri için Postgres, kimlik doğrulama için magic link, erişim kontrolü için ise row-level security policy'leri. End-to-end testleri Playwright ile, video kaydı açık şekilde yazacağım, ve final build'i Vercel'e deploy edeceğim.

Süreci yapılandırmak için Spec-Kit kullanıyorum — bu bana sağlıklı bir disiplin dayatıyor: önce spec, sonra plan, sonra task'lara bölme, sonra implement. AI pair'im Claude Code, ve Supabase MCP server'ı bağlı olduğu için Postgres şemamı introspect edebiliyor ve build sırasında migration'ları doğrudan uygulayabiliyor.

Başlamadan birkaç temel kural. Para her zaman integer cents olarak BIGINT kolonlarda saklanıyor — float kullanılmıyor — bir ödeme akışında yuvarlama hatası taşımayalım diye. Bu MVP için tek para birimi US dollar. Authentication production'da magic link ile çalışıyor ama bu demo'da email round-trip'ini mock'layacağım, böylece bir inbox'a tıklayışımı izleyerek vakit kaybetmeyeceksiniz. Ve sadece recipient bir talebi ödeyebilir veya reddedebilir, sadece sender ise iptal edebilir — bunların hepsini database katmanında row-level security policy'leri zorlayacak.

Kayıtla ilgili küçük bir not: Claude Code response üretirken videoyu duraklatıyor olacağım, böylece bir loading indicator'a bakarak vaktinizi boşa harcamayacaksınız. Cursor ileri "zıpladığında", bu sadece AI'ın işini bitirip kayda kaldığım yerden devam ettiğim anlamına geliyor. Kod, kararlar ve açıklamalar tamamen bana ait — Claude buradaki pair'im, yerime geçen biri değil.

Hadi — projeyi açıp Spec-Kit init ile başlayalım.
