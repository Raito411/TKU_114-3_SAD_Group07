from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def get_font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=1 if bold else 0)
        except OSError:
            continue
    return ImageFont.load_default()


TITLE = get_font(34, True)
SUBTITLE = get_font(18)
LANE = get_font(24, True)
TEXT = get_font(18)
SMALL = get_font(15)


def draw_wrapped(draw, box, text, font, fill="#243042", line_gap=4):
    x1, y1, x2, y2 = box
    max_width = x2 - x1 - 24
    lines = []
    for raw in text.split("\n"):
        line = ""
        for ch in raw:
            test = line + ch
            if draw.textbbox((0, 0), test, font=font)[2] <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = ch
        if line:
            lines.append(line)
    heights = [draw.textbbox((0, 0), line, font=font)[3] for line in lines]
    total_h = sum(heights) + line_gap * (len(lines) - 1)
    y = y1 + ((y2 - y1) - total_h) / 2
    for line, h in zip(lines, heights):
        w = draw.textbbox((0, 0), line, font=font)[2]
        draw.text((x1 + ((x2 - x1) - w) / 2, y), line, font=font, fill=fill)
        y += h + line_gap


def arrow(draw, start, end, fill="#5d677a", width=3):
    draw.line((start, end), fill=fill, width=width)
    draw_arrow_head(draw, start, end, fill)


def draw_arrow_head(draw, start, end, fill="#5d677a"):
    x1, y1 = start
    x2, y2 = end
    if abs(x2 - x1) >= abs(y2 - y1):
        direction = 1 if x2 >= x1 else -1
        points = [(x2, y2), (x2 - direction * 12, y2 - 7), (x2 - direction * 12, y2 + 7)]
    else:
        direction = 1 if y2 >= y1 else -1
        points = [(x2, y2), (x2 - 7, y2 - direction * 12), (x2 + 7, y2 - direction * 12)]
    draw.polygon(points, fill=fill)


def polyline_arrow(draw, points, fill="#5d677a", width=3):
    draw.line(points, fill=fill, width=width, joint="curve")
    draw_arrow_head(draw, points[-2], points[-1], fill)


def box_mid(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) // 2, (y1 + y2) // 2)


def draw_step(draw, box, text, fill="#eef4ff", outline="#4263eb", kind="box"):
    if kind == "start":
        draw.ellipse(box, fill="#e8f7ef", outline="#2f9e44", width=3)
    elif kind == "decision":
        x1, y1, x2, y2 = box
        cx, cy = box_mid(box)
        draw.polygon([(cx, y1), (x2, cy), (cx, y2), (x1, cy)], fill="#fff6db", outline="#f08c00")
        draw.line([(cx, y1), (x2, cy), (cx, y2), (x1, cy), (cx, y1)], fill="#f08c00", width=3)
    else:
        draw.rounded_rectangle(box, radius=10, fill=fill, outline=outline, width=3)
    draw_wrapped(draw, box, text, TEXT)


def lane_layout(draw, title, lanes, path, output, width=2200):
    lane_h = 190
    top = 145
    left_label_w = 220
    margin = 55
    height = top + lane_h * len(lanes) + 95
    img = Image.new("RGB", (width, height), "#f7f8fb")
    draw = ImageDraw.Draw(img)
    draw.text((margin, 35), title, font=TITLE, fill="#18202f")
    draw.text((margin, 83), "泳道流程圖依現有 0720 文字流程整理，保留角色交接、判斷與痛點標示", font=SUBTITLE, fill="#586174")

    lane_y = {}
    for idx, lane in enumerate(lanes):
        y1 = top + idx * lane_h
        y2 = y1 + lane_h
        lane_y[lane] = (y1, y2)
        bg = "#ffffff" if idx % 2 == 0 else "#f1f5fb"
        draw.rectangle((margin, y1, width - margin, y2), fill=bg, outline="#d8dee9", width=2)
        draw.rectangle((margin, y1, margin + left_label_w, y2), fill="#e8eefb", outline="#d8dee9", width=2)
        draw_wrapped(draw, (margin + 10, y1, margin + left_label_w - 10, y2), lane, LANE, fill="#243b86")

    boxes = {}
    for item in path:
        key, lane, x, label, kind = item
        y1, y2 = lane_y[lane]
        if kind == "decision":
            box = (x, y1 + 35, x + 150, y2 - 35)
        elif kind == "start":
            box = (x, y1 + 48, x + 105, y2 - 48)
        else:
            box = (x, y1 + 38, x + 210, y2 - 38)
        boxes[key] = box

    for item in path:
        key, lane, x, label, kind = item
        draw_step(draw, boxes[key], label, kind=kind)

    return img, draw, boxes


def render_as_is():
    lanes = ["買方學生", "賣方學生", "系統管理員"]
    path = [
        ("START", "買方學生", 310, "開始", "start"),
        ("A01", "賣方學生", 470, "A-01\n刊登分散資訊\nP-01", "box"),
        ("A02", "買方學生", 730, "A-02\n手動尋找二手書\nP-01", "box"),
        ("D01", "買方學生", 990, "是否找到\n可能符合的書？", "decision"),
        ("A03", "買方學生", 1210, "A-03\n私訊詢問書況、價格、是否仍可交易", "box"),
        ("A04", "賣方學生", 1450, "A-04\n回覆書籍狀態與交易條件\nP-03", "box"),
        ("D02", "買方學生", 1695, "賣方回覆\n可交易？", "decision"),
        ("A05", "買方學生", 1910, "A-05\n表示購買意願\nP-02", "box"),
        ("A06", "買方學生", 2140, "A-06\n私訊協調面交時間地點\nP-03、P-04", "box"),
        ("A07", "賣方學生", 2140, "A-07\n手動更新或未更新是否售出\nP-02", "box"),
        ("A08", "系統管理員", 2140, "A-08\n缺乏集中資料可檢視或處理\nP-05", "box"),
        ("END", "系統管理員", 2410, "結束", "start"),
    ]
    img, draw, boxes = lane_layout(None, "As-Is 現況泳道流程圖", lanes, path, ROOT / "as_is_process.png", width=2600)

    polyline_arrow(draw, [(boxes["START"][2], box_mid(boxes["START"])[1]), (430, box_mid(boxes["START"])[1]), (430, box_mid(boxes["A01"])[1]), (boxes["A01"][0], box_mid(boxes["A01"])[1])])
    polyline_arrow(draw, [(boxes["A01"][2], box_mid(boxes["A01"])[1]), (705, box_mid(boxes["A01"])[1]), (705, box_mid(boxes["A02"])[1]), (boxes["A02"][0], box_mid(boxes["A02"])[1])])
    arrow(draw, (boxes["A02"][2], box_mid(boxes["A02"])[1]), (boxes["D01"][0], box_mid(boxes["D01"])[1]))
    arrow(draw, (boxes["D01"][2], box_mid(boxes["D01"])[1]), (boxes["A03"][0], box_mid(boxes["A03"])[1]))
    polyline_arrow(draw, [(boxes["A03"][2], box_mid(boxes["A03"])[1]), (1415, box_mid(boxes["A03"])[1]), (1415, box_mid(boxes["A04"])[1]), (boxes["A04"][0], box_mid(boxes["A04"])[1])])
    polyline_arrow(draw, [(boxes["A04"][2], box_mid(boxes["A04"])[1]), (1670, box_mid(boxes["A04"])[1]), (1670, box_mid(boxes["D02"])[1]), (boxes["D02"][0], box_mid(boxes["D02"])[1])])
    arrow(draw, (boxes["D02"][2], box_mid(boxes["D02"])[1]), (boxes["A05"][0], box_mid(boxes["A05"])[1]))
    arrow(draw, (boxes["A05"][2], box_mid(boxes["A05"])[1]), (boxes["A06"][0], box_mid(boxes["A06"])[1]))
    polyline_arrow(draw, [(box_mid(boxes["A06"])[0], boxes["A06"][3]), (box_mid(boxes["A06"])[0], boxes["A07"][1])])
    polyline_arrow(draw, [(box_mid(boxes["A07"])[0], boxes["A07"][3]), (box_mid(boxes["A07"])[0], boxes["A08"][1])])
    arrow(draw, (boxes["A08"][2], box_mid(boxes["A08"])[1]), (boxes["END"][0], box_mid(boxes["END"])[1]))
    draw.text((1035, box_mid(boxes["D01"])[1] - 35), "是", font=SMALL, fill="#586174")
    draw.text((1535, box_mid(boxes["D02"])[1] - 54), "是", font=SMALL, fill="#586174")
    polyline_arrow(draw, [(box_mid(boxes["D01"])[0], boxes["D01"][3]), (box_mid(boxes["D01"])[0], 315), (2380, 315), (2380, box_mid(boxes["END"])[1]), (boxes["END"][0], box_mid(boxes["END"])[1])], fill="#adb5bd", width=2)
    draw.text((1018, boxes["D01"][3] + 12), "否，結束搜尋", font=SMALL, fill="#586174")
    polyline_arrow(draw, [(box_mid(boxes["D02"])[0], boxes["D02"][3]), (box_mid(boxes["D02"])[0], 315), (box_mid(boxes["A02"])[0], 315), (box_mid(boxes["A02"])[0], boxes["A02"][3])], fill="#adb5bd", width=2)
    draw.text((1590, boxes["D02"][3] + 12), "否，回到搜尋", font=SMALL, fill="#586174")
    draw.text((55, img.height - 42), "來源：as_is_process.md；痛點 P-01 至 P-05 依 Project Charter v2 與 0714 需求整理", font=SMALL, fill="#697386")
    img.save(ROOT / "as_is_process.png")


def render_to_be():
    lanes = ["學生使用者", "賣方學生", "系統", "買方學生", "系統管理員"]
    path = [
        ("START", "學生使用者", 300, "開始", "start"),
        ("T01", "學生使用者", 450, "T-01\n註冊或登入系統\nFR-12", "box"),
        ("T02", "賣方學生", 650, "T-02\n新增二手書資料\n狀態預設未交易", "box"),
        ("S01", "系統", 850, "建立書籍資料、刊登序號與資料庫紀錄", "box"),
        ("T03", "賣方學生", 1050, "T-03\n設定折扣或編輯刊登資料", "box"),
        ("T04", "買方學生", 1250, "T-04\n搜尋書籍", "box"),
        ("S02", "系統", 1450, "顯示搜尋結果與詳細資料", "box"),
        ("D01", "買方學生", 1660, "是否為\n自己的刊登？", "decision"),
        ("T06", "買方學生", 1845, "T-06\n送出或取消未核准購買需求", "box"),
        ("S03", "系統", 2050, "送出需求通知賣方\n取消需求不通知\n公開狀態未交易", "box"),
        ("T07", "賣方學生", 2250, "T-07\n選擇買方並設定面交時間", "box"),
        ("S04", "系統", 2455, "更新為交易中\n寄送信箱通知\n取消未被選到需求", "box"),
        ("T08", "學生使用者", 2660, "T-08\n查看交易狀態與信箱通知", "box"),
        ("D02", "賣方學生", 2890, "交易是否\n完成？", "decision"),
        ("T09A", "賣方學生", 3090, "T-09A\n更新為交易完成", "box"),
        ("T09B", "賣方學生", 3290, "T-09B\n標記交易失敗", "box"),
        ("S05", "系統", 3290, "通知買方、取消需求、重新刊登、扣信任度", "box"),
        ("D03", "系統", 3525, "信任度\n是否為 0？", "decision"),
        ("T10", "系統管理員", 3740, "T-10\n停權使用者\n取消刊登與需求", "box"),
    ]
    img, draw, boxes = lane_layout(None, "To-Be 目標泳道流程圖", lanes, path, ROOT / "to_be_process.png", width=4050)
    seq = ["START", "T01", "T02", "S01", "T03", "T04", "S02", "D01", "T06", "S03", "T07", "S04", "T08", "D02"]
    for a, b in zip(seq, seq[1:]):
        arrow(draw, (boxes[a][2], box_mid(boxes[a])[1]), (boxes[b][0], box_mid(boxes[b])[1]))
    arrow(draw, (boxes["D01"][2], box_mid(boxes["D01"])[1]), (boxes["T08"][0], box_mid(boxes["T08"])[1]), fill="#adb5bd", width=2)
    draw.text((1808, box_mid(boxes["D01"])[1] - 45), "否，送出需求", font=SMALL, fill="#586174")
    draw.text((1995, box_mid(boxes["D01"])[1] + 26), "是，不顯示購買按鈕", font=SMALL, fill="#586174")
    arrow(draw, (boxes["D02"][2], box_mid(boxes["D02"])[1] - 15), (boxes["T09A"][0], box_mid(boxes["T09A"])[1]), fill="#2f9e44")
    draw.text((3020, box_mid(boxes["D02"])[1] - 48), "是", font=SMALL, fill="#586174")
    arrow(draw, (boxes["T09A"][2], box_mid(boxes["T09A"])[1]), (boxes["T09B"][0], box_mid(boxes["T09B"])[1]), fill="#f03e3e", width=2)
    draw.text((3188, box_mid(boxes["T09A"])[1] - 36), "否或後續失敗", font=SMALL, fill="#586174")
    arrow(draw, (box_mid(boxes["T09B"])[0], boxes["T09B"][3]), (box_mid(boxes["S05"])[0], boxes["S05"][1]), fill="#f03e3e")
    arrow(draw, (boxes["S05"][2], box_mid(boxes["S05"])[1]), (boxes["D03"][0], box_mid(boxes["D03"])[1]), fill="#f03e3e")
    arrow(draw, (boxes["D03"][2], box_mid(boxes["D03"])[1]), (boxes["T10"][0], box_mid(boxes["T10"])[1]), fill="#f03e3e")
    draw.text((3660, box_mid(boxes["D03"])[1] - 32), "是", font=SMALL, fill="#586174")
    arrow(draw, (box_mid(boxes["D03"])[0], boxes["D03"][1]), (box_mid(boxes["T02"])[0], boxes["T02"][3]), fill="#adb5bd", width=2)
    draw.text((3355, boxes["D03"][1] - 28), "否，重新刊登", font=SMALL, fill="#586174")
    draw.text((55, img.height - 42), "來源：to_be_process.md；對應 FR-01 至 FR-14、NFR-01、NFR-02 與 BR-01 至 BR-15", font=SMALL, fill="#697386")
    img.save(ROOT / "to_be_process.png")


if __name__ == "__main__":
    render_as_is()
    render_to_be()
    print(ROOT / "as_is_process.png")
    print(ROOT / "to_be_process.png")
