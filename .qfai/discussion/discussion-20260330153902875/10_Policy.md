# 10_Policy

## Policy Statements

1. Validation Policy  
   validator は deterministic check のみを担当し、semantic judgment は reviewer に委譲する。

2. Release Truth Policy  
   changelog / steering / docs は implemented, foundation-only, deferred を明確に区別し、過大表現を禁止する。

3. Mode Policy  
   prototyping は explicit CLI override を最優先し、discussion artifact は recommendation、report は actual mode を記録する。

4. Runtime Evidence Policy  
   unsupported environment は fake success にしない。`skipped` または `failed` と理由を必ず記録する。

5. Migration Policy  
   4-axis legacy asset と weak schema は migration guidance を伴う warning path を提供し、即時 hard break は避ける。

6. Review Policy  
   review roster 順守、FAIL 時の full restart、alternative-required rule を守る。
