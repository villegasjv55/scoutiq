import re
import requests

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
s = requests.Session()
s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})

page_url = "https://understat.com/league/EPL/2023"
p = s.get(page_url, timeout=30)
print("PAGE status:", p.status_code, "| bytes:", len(p.text))
print("PAGE title:", re.findall(r"<title>(.*?)</title>", p.text, re.S))
print("PAGE has JSON.parse:", "JSON.parse" in p.text, "| has getLeagueData:", "getLeagueData" in p.text)
txt = re.sub(r"<script.*?</script>|<style.*?</style>", "", p.text, flags=re.S)
txt = re.sub(r"<[^>]+>", " ", txt)
print("PAGE visible text:", " ".join(txt.split())[:500])
print("PAGE scripts:", re.findall(r'<script[^>]+src="([^"]+)"', p.text))

hdr = {"X-Requested-With": "XMLHttpRequest", "Referer": page_url,
       "Accept": "application/json, text/javascript, */*; q=0.01"}
for url in ["https://understat.com/getLeagueData/EPL/2023",
            "https://understat.com/main/getPlayersStats/",
            "https://understat.com/getPlayersStats/EPL/2023"]:
    r = s.get(url, headers=hdr, timeout=30)
    print("GET ", url, "->", r.status_code, r.headers.get("content-type"), "|", r.text[:120].replace("\n", " "))

r = s.post("https://understat.com/main/getPlayersStats/", data={"league": "EPL", "season": "2023"}, headers=hdr, timeout=30)
print("POST getPlayersStats ->", r.status_code, r.headers.get("content-type"), "|", r.text[:120].replace("\n", " "))
