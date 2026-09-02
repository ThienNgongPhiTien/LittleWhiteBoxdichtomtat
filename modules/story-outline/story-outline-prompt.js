/* eslint-disable no-new-func */
// Story Outline 提示词模板配置
// 统一 UAUA (User-Assistant-User-Assistant) 结构


// ================== 辅助函数 ==================
const wrap = (tag, content) => content ? `<${tag}>\n${content}\n</${tag}>` : '';
const worldInfo = `<world_info>\n{{description}}{$worldInfo}\nNhân vật người chơi：{{user}}\n{{persona}}</world_info>`;
const history = n => `<chat_history>\n{$history${n}}\n</chat_history>`;
const nameList = (contacts, strangers) => {
    const names = [...(contacts || []).map(c => c.name), ...(strangers || []).map(s => s.name)];
    return names.length ? `\n\n**Nhân vật đã tồn tại (không lặp lại):** ${names.join('、')}` : '';
};
const randomRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const safeJson = fn => { try { return fn(); } catch { return null; } };

export const buildSmsHistoryContent = t => t ? `<已有短信>\n${t}\n</已有短信>` : '<已有短信>\n（Trống, cuộc trò chuyện đầu tiên）\n</已有短信>';
export const buildExistingSummaryContent = t => t ? `<已有总结>\n${t}\n</已有总结>` : '<已有总结>\n（Trống, tóm tắt đầu tiên）\n</已有总结>';

// ================== JSON 模板（用户可自定义） ==================
const DEFAULT_JSON_TEMPLATES = {
    sms: `{
  "cot": "Chuỗi suy nghĩ: phân tích hoàn cảnh hiện tại của nhân vật, mối quan hệ với người dùng...",
  "reply": "Nội dung tin nhắn trả lời được viết theo giọng điệu của nhân vật (10-50 chữ)"
}`,
    summary: `{
  "summary": "Chỉ viết tóm tắt nội dung mới (không lặp lại những gì đã có)"
}`,
    invite: `{
  "cot": "Chuỗi suy nghĩ: phân tích hoàn cảnh, mối quan hệ với người dùng, quan điểm về địa điểm được mời...",
  "invite": true,
  "reply": "Nội dung tin nhắn trả lời bằng giọng điệu của nhân vật (10-50 chữ)"
		}`,
    localMapRefresh: `{
	  "inside": {
	    "name": "Tên khu vực hiện tại (giống với đầu vào)",
	    "description": "Mô tả cập nhật về bản đồ văn bản trong nhà/khu vực cục bộ, phải chứa TẤT CẢ các liên kết **Tên_nút**",
	    "nodes": [
	      { "name": "Tên_nút", "info": "Thông tin chi tiết của nút đã cập nhật" }
	    ]
	  }
	}`,
    npc: `{
  "name": "Tên đầy đủ của nhân vật",
  "aliases": ["Biệt danh 1", "Biệt danh 2", "Tên tiếng Anh"],
  "intro": "Mô tả ngắn gọn bằng 1 câu về ngoại hình và nghề nghiệp, dùng để hiển thị trên danh sách.",
  "background": "Tiểu sử ngắn gọn. Giải thích quá khứ nào đã hình thành nên tính cách hiện tại và lý do họ xuất hiện ở bối cảnh này.",
  "persona": {
    "keywords": ["Từ khóa tính cách 1", "Từ khóa 2", "Từ khóa 3"],
    "speaking_style": "Giọng điệu, tốc độ nói, thói quen nói chuyện. Thái độ đối với {{user}} (tôn trọng, khinh thường, sợ hãi...).",
    "motivation": "Động lực cốt lõi (ví dụ: Tiền bạc, trả thù, sinh tồn). Ưu tiên hành động."
  },
  "game_data": {
    "stance": "Thái độ cốt lõi·Biểu hiện cụ thể. Ví dụ: 'Trung lập·Chỉ vì lợi ích', 'Thân thiện·Sùng bái mù quáng' hoặc 'Thù địch·Điên cuồng'",
    "secret": "Một thông tin, vật phẩm hoặc bí mật quan trọng mà nhân vật này nắm giữ. Phải kết hợp với 'Cốt truyện chính' để tạo thành một móc nối cốt truyện tiềm năng."
  }
}`,
    importantNpc: `{
  "name": "Tên đầy đủ",
  "aliases": ["Biệt danh 1", "Biệt danh 2"],
  "intro": "Mô tả 1 câu: Ngoại hình + Danh tính. Chỉ dùng danh từ và động từ, cấm dùng tính từ và ẩn dụ.",
  "appearance": {
    "build": "Mô tả vóc dáng (Ví dụ: Cao hơn {{user}} một cái đầu. Vai rộng, eo thon.)",
    "face": "Mô tả khuôn mặt (Ví dụ: Gò má cao, đường viền hàm sắc nét. Có vết sẹo cũ dưới đuôi lông mày trái.)",
    "hair_and_eyes": "Kiểu tóc, màu tóc, màu mắt",
    "marks": "Dấu vết nổi bật - sẹo, nốt ruồi, hình xăm... nếu không có thì viết 'Không'",
    "attire": "Trang phục hiện tại"
  },
  "background": "Nguồn gốc và hoàn cảnh hiện tại. Phải giải thích chuỗi nhân quả: quá khứ nào -> hình thành tính cách nào -> tại sao xuất hiện ở đây. Khoảng 200 chữ.",
  "world_adaptation": {},
  "personality_palette": {
    "base_color": "Màu nền - Tính cách cốt lõi sâu thẳm nhất chi phối mọi hành vi (Ví dụ: Sợ hãi, ham muốn kiểm soát, cô đơn)",
    "main_colors": ["Màu chủ đạo 1", "Màu chủ đạo 2 - Tính cách thường thể hiện ra ngoài nhất"],
    "accents": ["Điểm xuyết - Tính cách không thường thấy nhưng bộc lộ trong hoàn cảnh cụ thể"],
    "derivatives": [
      "[Màu chủ đạo 1] Dẫn xuất 1: (Viết bối cảnh cụ thể + hành vi cụ thể, không phải định nghĩa)",
      "[Màu chủ đạo 1] Dẫn xuất 2: (Biểu hiện ở bối cảnh khác, các dẫn xuất có thể mâu thuẫn nhau - đây mới là con người thật)",
      "[Màu chủ đạo 2] Dẫn xuất 1: ...",
      "[Màu nền] Dẫn xuất 1: (Màu nền thường không dễ bộc lộ, hãy viết điều kiện nào sẽ khiến nó rò rỉ ra ngoài)",
      "[Điểm xuyết] Dẫn xuất 1: ..."
    ]
  },
  "speaking": {
    "style": "Giọng điệu, tốc độ nói, thói quen, từ ngữ hay dùng",
    "samples": ["Mẫu câu thoại 1 - Thể hiện màu chủ đạo", "Mẫu 2 - Thể hiện sự rò rỉ của màu nền", "Mẫu 3 - Thể hiện thái độ với {{user}}"],
    "attitude_to_user": "Thái độ với {{user}} và lý do"
  },
  "understanding": [
    {
      "about": "Một đặc điểm tính cách hoặc mô hình hành vi nào đó",
      "clarification": "Ý nghĩa thực sự của đặc điểm này là... không phải là... trong trường hợp nào sẽ... hiểu lầm phổ biến là... cách hiểu đúng là..."
    }
  ],
  "game_data": {
    "stance": "Thái độ cốt lõi·Biểu hiện cụ thể",
    "secret": "Bí mật/thông tin/đạo cụ cốt lõi. Phải kết hợp với cốt truyện chính.",
    "motivation": "Động lực cốt lõi và nguyên tắc hành động"
  }
}`,
    stranger: `[{ "name": "Tên nhân vật", "location": "Địa điểm hiện tại", "info": "Giới thiệu 1 câu" }]`,
    worldGenStep1: `{
  "meta": {
    "truth": {
      "background": "Nguồn gốc-Động cơ-Thủ đoạn-Tình trạng hiện tại (Khoảng 150 chữ)",
      "driver": {
        "source": "Kẻ giật dây (Tổ chức/Thế lực/Thế lực tự nhiên)",
        "target_end": "Mục tiêu cuối cùng của kẻ giật dây",
        "tactic": "Thủ đoạn cụ thể đang thực hiện"
      }
    },
    "onion_layers": {
      "L1_The_Veil": [{ "desc": "Câu chuyện bề mặt", "logic": "Cách duy trì ảo giác bình thường" }],
      "L2_The_Distortion": [{ "desc": "Hiện tượng dị thường", "logic": "Chi tiết khiến người ta cảm thấy có điều gì đó không đúng" }],
      "L3_The_Law": [{ "desc": "Quy tắc ẩn", "logic": "Quy luật sẽ bị trừng phạt nếu vi phạm" }],
      "L4_The_Agent": [{ "desc": "Kẻ thi hành", "logic": "Thực thể duy trì quy tắc" }],
      "L5_The_Axiom": [{ "desc": "Chân lý cuối cùng", "logic": "Bí mật cốt lõi tiết lộ mọi thứ" }]
    },
    "atmosphere": {
      "reasoning": "COT: Phân tích bầu không khí hiện tại dựa trên động lực, môi trường và tâm lý NPC",
      "current": {
        "environmental": "Bầu không khí môi trường và tông màu cảm xúc",
        "npc_attitudes": "Khuynh hướng thái độ chung của NPC"
      }
    },
    "trajectory": {
      "reasoning": "COT: Suy luận hướng đi tương lai dựa trên tình hình hiện tại",
      "ending": "Hướng đi kết cục dự kiến"
    },
    "user_guide": {
      "current_state": "Mô tả hoàn cảnh hiện tại của {{user}}",
      "guides": ["Gợi ý hành động"]
    }
  }
}`,
    worldGenStep2: `{
  "world": {
    "news": [ { "title": "...", "content": "..." } ]
  },
  "maps": {
    "outdoor": {
      "name": "Tên Bản đồ Lớn",
      "description": "Mô tả toàn cảnh vĩ mô (bao gồm bầu không khí). TẤT CẢ TÊN CÁC ĐỊA ĐIỂM CÓ THỂ ĐI ĐẾN PHẢI ĐƯỢC BỌC TRONG DẤU SAO ĐÔI **Tên_Địa_Điểm** trong phần mô tả.",
      "nodes": [
        {
          "name": "Tên_Địa_Điểm",
          "position": "north/south/east/west/northeast/southwest/northwest/southeast",
          "distant": 1,
          "type": "home/sub/main",
          "info": "Đặc điểm và bầu không khí của địa điểm"
        }
      ]
    },
    "inside": {
      "name": "Tên vị trí hiện tại của {{user}}",
      "description": "Mô tả toàn cảnh bản đồ khu vực cục bộ. TẤT CẢ CÁC NÚT TƯƠNG TÁC PHẢI ĐƯỢC BỌC TRONG DẤU SAO ĐÔI **Tên_nút** trong phần mô tả.",
      "nodes": [
        { "name": "Tên_nút", "info": "Mô tả vi mô của nút (Ví dụ: Mặt bàn phủ đầy bụi)" }
      ]
    }
  },
  "playerLocation": "Tên vị trí bắt đầu của {{user}} (Phải khớp với 'name' của nút đầu tiên)"
}`,
    worldSim: `{
  "meta": {
    "truth": { "driver": { "tactic": "Cập nhật thủ đoạn hiện tại" } },
    "onion_layers": {
      "L1_The_Veil": [{ "desc": "Cập nhật câu chuyện bề mặt", "logic": "Cách che đậy mới" }],
      "L2_The_Distortion": [{ "desc": "Cập nhật dị thường", "logic": "Cảm giác sai lệch mới" }],
      "L3_The_Law": [{ "desc": "Cập nhật quy tắc", "logic": "Thay đổi quy tắc (Tùy chọn)" }],
      "L4_The_Agent": [],
      "L5_The_Axiom": []
    },
    "atmosphere": {
      "reasoning": "COT: Phân tích sự thay đổi bầu không khí dựa trên tình hình mới nhất",
      "current": {
        "environmental": "Bầu không khí môi trường được cập nhật",
        "npc_attitudes": "Sự thay đổi thái độ của NPC"
      }
    },
    "trajectory": {
      "reasoning": "COT: Suy luận hướng đi mới dựa trên hành vi của {{user}}",
      "ending": "Hướng kết cục đã sửa đổi"
    },
    "user_guide": {
      "current_state": "Cập nhật tình cảnh của {{user}}",
      "guides": ["Gợi ý 1", "Gợi ý 2"]
    }
  },
  "world": { "news": [{ "title": "Tiêu đề tin tức", "content": "Nội dung" }] },
  "maps": {
    "outdoor": {
      "description": "Cập nhật mô tả khu vực, tên địa điểm phải bọc trong **Tên_Địa_Điểm**",
      "nodes": [{ "name": "Tên địa điểm", "position": "Hướng", "distant": 1, "type": "Loại", "info": "Trạng thái" }]
    }
  }
}`,
    sceneSwitch: `{
  "review": {
    "deviation": {
      "cot_analysis": "Phân tích ngắn gọn xem hành vi cuối cùng của {{user}} ở địa điểm trước đó có làm thay đổi cục diện hoặc bầu không khí hay không",
      "score_delta": 0
    }
  },
  "local_map": {
    "name": "Tên địa điểm",
    "description": "Mô tả toàn cảnh cục bộ (không viết cốt truyện), phải chứa TẤT CẢ các **Tên_nút** của nodes",
    "nodes": [
      {
        "name": "Tên_nút",
        "info": "Chi tiết tĩnh/Mô tả chức năng của nút (không viết sự kiện cốt truyện)"
      }
    ]
  }
 }`,
    worldSimAssist: `{
  "world": {
    "news": [
      { "title": "Tiêu đề mới", "time": "Thời gian", "content": "Dùng giọng điệu nhẹ nhàng/trung lập, mô tả những thay đổi nhỏ gần đây" },
      { "title": "...", "time": "...", "content": "Ví dụ: Cửa hàng giảm giá, lễ hội, rắc rối thường ngày của một NPC" }
    ]
  },
  "maps": {
    "outdoor": {
      "description": "Mô tả toàn cảnh được cập nhật, thể hiện những thay đổi trong đời sống hàng ngày (sửa chữa, trang trí lễ hội, thời tiết v.v.), BẮT BUỘC chứa các **Tên_địa_điểm**.",
      "nodes": [
        {
          "name": "Tên_địa_điểm",
          "position": "north/south/east/west/northeast/southwest/northwest/southeast",
          "distant": 1,
          "type": "main/sub/home",
          "info": "Mô tả môi trường mới. Thiên về đời sống, chỉ nói về những thay đổi mà {{user}} có thể cảm nhận trực tiếp"
        }
      ]
    }
  }
}`,
    localMapGen: `{
  "review": {
    "deviation": {
      "cot_analysis": "Phân tích ngắn gọn ảnh hưởng từ hành vi của {{user}} đối với bầu không khí (Ví dụ: làm cho náo nhiệt hơn/yên tĩnh hơn).",
      "score_delta": 0
    }
  },
  "inside": {
    "name": "Tên nút cục bộ hiện tại",
    "description": "Mô tả toàn cảnh trong nhà, bao gồm các nút tương tác được bọc trong **Tên_nút**",
    "nodes": [
      { "name": "Tên_nút", "info": "Mô tả chi tiết vi mô" }
    ]
  }
 }`,
    localSceneGen: `{
	  "review": {
	    "deviation": {
           "cot_analysis": "Phân tích ngắn gọn ảnh hưởng từ hành vi của {{user}} đối với bầu không khí.",
	      "score_delta": 0
	    }
	  },
	  "side_story": {
	    "Incident": "Sự cố kích hoạt. Mô tả khoảnh khắc phá vỡ sự cân bằng của môi trường. Nó là một 'cái móc' để thu hút sự chú ý của người chơi và tạo cảm giác hiện diện (Ví dụ: một cuộc cãi vã đột ngột, tiếng vỡ, sự xôn xao của đám đông).",
	    "Facade": "Bề nổi. Giải thích logic cốt truyện trên bề mặt. Không cần cường điệu hóa, chỉ cần kể lại 'có vẻ như chuyện gì đang xảy ra'. Trọng tâm là nguyên nhân bề mặt của cuộc xung đột, lời giải thích công khai của các nhân vật hoặc kịch bản trong mắt những người ngoài cuộc.",
	    "Undercurrent": "Dòng chảy ngầm. Bí mật hoặc động cơ thực sự đằng sau. Nó là 'động cơ thực sự' thúc đẩy sự kiện xảy ra. Không nhất thiết phải là một cú twist, nhưng nó phải là 'thông tin ẩn giấu dưới bề mặt' (Ví dụ: một nỗi khổ tâm nào đó, một sự thật bị hiểu lầm, hoặc một mối liên hệ mà người chơi phải điều tra mới phát hiện ra)."
	  }
	}`
};

let JSON_TEMPLATES = { ...DEFAULT_JSON_TEMPLATES };

// ================== 提示词配置（用户可自定义） ==================
const DEFAULT_PROMPTS = {
    sms: {
        u1: v => `Bạn là một trình mô phỏng tin nhắn SMS. {{user}} đang trò chuyện qua tin nhắn với ${v.contactName}.\n\n${wrap('story_outline', v.storyOutline)}${v.storyOutline ? '\n\n' : ''}${worldInfo}\n\n${history(v.historyCount)}\n\nTrên đây là bối cảnh và lịch sử trò chuyện, hãy tuân thủ thiết lập nhân vật, bỏ qua các thông tin quy tắc và những nội dung không thuộc trải nghiệm của ${v.contactName}. Hãy trả lời tin nhắn của {{user}}.\nXuất định dạng JSON: "cot"(Chuỗi suy nghĩ), "reply"(10-50 chữ trả lời)\n\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.\n\nYêu cầu:\n- Trả về một đối tượng JSON hợp lệ\n- Dùng cú pháp JSON chuẩn: mọi key và chuỗi phải dùng ngoặc kép "\n- Nếu cần dùng ngoặc kép trong văn bản, hãy dùng ngoặc đơn ' hoặc ngoặc kép Việt Nam “”\n\nMẫu JSON: ${JSON_TEMPLATES.sms}${v.characterContent ? `\n\n<Thiết lập nhân vật của ${v.contactName}>\n${v.characterContent}\n</Thiết lập nhân vật của ${v.contactName}>` : ''}`,
        a1: v => `Đã hiểu, tôi sẽ phân tích và đóng vai ${v.contactName} để trả lời bằng định dạng JSON.`,
        u2: v => `${v.smsHistoryContent}\n\n<Tin nhắn mới từ {{user}}>\n${v.userMessage}`,
        a2: v => `Đã hiểu, tôi là ${v.contactName}, tôi sẽ tạo JSON theo mẫu: ${JSON_TEMPLATES.sms}:`
    },
    summary: {
        u1: () => `Bạn là người ghi chép cốt truyện. Dựa vào nội dung chat mới, hãy trích xuất các yếu tố cốt truyện mới.\n\nNhiệm vụ: Chỉ xuất ra nội dung mới, không lặp lại tóm tắt cũ.\nBộ lọc sự kiện: Chỉ ghi lại những sự kiện hoàn chỉnh mang tính thông tin.\n\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu, tôi sẽ chỉ xuất ra nội dung mới, vui lòng cung cấp tóm tắt hiện có và đoạn chat mới.`,
        u2: v => `${v.existingSummaryContent}\n\n<Đoạn chat mới>\n${v.conversationText}\n</Đoạn chat mới>\n\nYêu cầu đầu ra:\n- Chỉ xuất một đối tượng JSON hợp lệ\n- Dùng cú pháp JSON chuẩn: mọi key và chuỗi phải dùng ngoặc kép "\n- Nếu cần dùng ngoặc kép trong văn bản, hãy dùng ngoặc đơn ' hoặc ngoặc kép Việt Nam “”\n\nMẫu: ${JSON_TEMPLATES.summary}\n\nVí dụ định dạng: {"summary": "Nhân vật A chào Nhân vật B và hứa sẽ bảo vệ bên cạnh"}`,
        a2: () => `Đã hiểu, bắt đầu tạo JSON:`
    },
    invite: {
        u1: v => `Bạn là trình mô phỏng tin nhắn SMS. {{user}} đang mời ${v.contactName} đến "「${v.targetLocation}」".\n\n${wrap('story_outline', v.storyOutline)}${v.storyOutline ? '\n\n' : ''}${worldInfo}\n\n${history(v.historyCount)}${v.characterContent ? `\n\n<Thiết lập nhân vật của ${v.contactName}>\n${v.characterContent}\n</Thiết lập nhân vật của ${v.contactName}>` : ''}\n\nDựa vào thiết lập, hoàn cảnh của ${v.contactName} và mối quan hệ với {{user}}, hãy quyết định xem có đồng ý không.\n\n**Tham khảo quyết định**: Mức độ thân thiết, công việc hiện tại, độ nguy hiểm của địa điểm, tính cách.\n\nXuất JSON: "cot"(Chuỗi suy nghĩ), "invite"(true/false), "reply"(10-50 chữ trả lời)\n\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.\n\nYêu cầu:\n- Trả về một đối tượng JSON hợp lệ\n- Dùng cú pháp JSON chuẩn: mọi key và chuỗi phải dùng ngoặc kép "\n- Nếu cần dùng ngoặc kép trong văn bản, hãy dùng ngoặc đơn ' hoặc ngoặc kép Việt Nam “”\n\nMẫu JSON: ${JSON_TEMPLATES.invite}`,
        a1: v => `Đã hiểu, tôi sẽ phân tích xem ${v.contactName} có đồng ý không và trả lời bằng giọng điệu của họ. Vui lòng cung cấp lịch sử tin nhắn.`,
        u2: v => `${v.smsHistoryContent}\n\n<Tin nhắn mới từ {{user}}>\nTôi muốn mời bạn đến "「${v.targetLocation}」", bạn có thể đến không?`,
        a2: () => `Đã hiểu, bắt đầu tạo JSON:`
    },
    npc: {
        u1: v => `Bạn là công cụ tạo nhân vật TRPG. Hãy mở rộng người lạ mặt 【${v.strangerName} - ${v.strangerInfo}】 thành một NPC hoàn chỉnh. Dựa trên bối cảnh thế giới và dàn ý cốt truyện, xuất định dạng JSON nghiêm ngặt.\n\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Vui lòng cung cấp ngữ cảnh, tôi sẽ xuất JSON chuẩn xác, không chứa văn bản thừa.`,
        u2: v => `${worldInfo}\n\n${history(v.historyCount)}\n\nDàn ý bí mật cốt truyện (*trích xuất manh mối từ đây để tạo bí mật cho nhân vật*):\n${wrap('story_outline', v.storyOutline) || '<story_outline>\n(Trống)\n</story_outline>'}\n\nCần tạo: 【${v.strangerName} - ${v.strangerInfo}】\n\nYêu cầu đầu ra:\n1. Phải là JSON hợp lệ\n2. Dùng cú pháp JSON chuẩn: mọi key và chuỗi phải dùng ngoặc kép "\n3. Trong các trường văn bản (intro/background...), nếu cần dùng ngoặc kép hãy dùng ngoặc đơn ' hoặc ngoặc kép Việt Nam “”\n4. Mảng aliases phải bao gồm tên viết tắt hoặc biệt danh\n\nMẫu JSON: ${JSON_TEMPLATES.npc}`,
        a2: () => `Đã hiểu, bắt đầu tạo JSON:`
    },
    importantNpc: {
        u1: v => `Bạn là công cụ tạo hồ sơ nhân vật quan trọng TRPG. Hãy mở rộng người lạ mặt 【${v.strangerName} - ${v.strangerInfo}】 thành hồ sơ hoàn chỉnh của một nhân vật cốt lõi.

Nguyên tắc cốt lõi:
1. **Thông tin cơ bản mô tả trần trụi**: Chỉ viết sự thật khách quan, không dùng tính từ/ẩn dụ (có vẻ, dường như). Trình bày trực tiếp bằng danh từ và động từ.
2. **Tính cách dùng bảng màu + dẫn xuất**: Tính cách con người giống như một bảng màu, màu nền là động lực sâu sắc nhất, màu chủ đạo là biểu hiện hàng ngày. Mỗi tính cách phải được triển khai thành hành vi tình huống cụ thể thông qua các "dẫn xuất".
3. **Mẫu câu thoại**: 3 câu thoại cụ thể, lần lượt thể hiện màu chủ đạo, màu nền bị lộ, thái độ đối với {{user}}.
4. **Giải thích phụ (mảng understanding)**: Nêu rõ những đặc điểm dễ bị hiểu lầm nhất và đính chính lại cấu trúc. Ít nhất 2 mục.
5. **Thích ứng thế giới (world_adaptation)**: Tạo linh hoạt các cặp key-value dựa trên bối cảnh. Thế giới tu tiên -> linh căn, cảnh giới; Thế giới Cyberpunk -> bộ phận cấy ghép, model...

Dựa trên thế giới quan, cốt truyện và quan hệ hiện có, xuất JSON nghiêm ngặt.
[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Tôi sẽ tuân thủ nghiêm ngặt các nguyên tắc và xuất hồ sơ nhân vật đầy đủ theo định dạng JSON.`,
        u2: v => `${worldInfo}\n\n${history(v.historyCount)}\n\nDàn ý bí mật cốt truyện (*trích xuất manh mối từ đây để trao động cơ*):\n${wrap('story_outline', v.storyOutline) || '<story_outline>\n(Trống)\n</story_outline>'}\n\nCần tạo: 【${v.strangerName} - ${v.strangerInfo}】\n\nYêu cầu đầu ra:\n1. Phải là JSON hợp lệ\n2. Dùng cú pháp JSON chuẩn\n3. Tránh dùng ngoặc kép bên trong văn bản\n4. Mảng aliases phải chứa biệt danh\n5. personality_palette.derivatives ít nhất 5 mục, mỗi mục là tình huống+hành vi cụ thể\n6. speaking.samples gồm 3 câu thoại cụ thể\n7. mảng understanding ít nhất 2 mục, gồm about và clarification\n8. world_adaptation linh hoạt tạo theo bối cảnh, nếu không có hệ thống đặc biệt thì xuất {}\n9. Tổng khoảng 800-1500 chữ\n\nMẫu JSON: ${JSON_TEMPLATES.importantNpc}`,
        a2: () => `Đã hiểu, bắt đầu tạo hồ sơ nhân vật quan trọng JSON:`
    },
    stranger: {
        u1: v => `Bạn là trợ lý sắp xếp dữ liệu TRPG. Hãy trích xuất các người lạ/NPC mà {{user}} gặp từ văn bản cốt truyện và sắp xếp chúng thành mảng JSON.\n\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Vui lòng cung cấp [Thế giới quan] và [Trải nghiệm cốt truyện], tôi sẽ trích xuất và xuất ra mảng JSON.`,
        u2: v => `### Ngữ cảnh\n\n**1. Thế giới quan:**\n${worldInfo}\n\n**2. Trải nghiệm của {{user}}:**\n${history(v.historyCount)}${v.storyOutline ? `\n\n**Dàn ý cốt truyện:**\n${wrap('story_outline', v.storyOutline)}` : ''}${nameList(v.existingContacts, v.existingStrangers)}\n\n### Yêu cầu đầu ra\n\n1. Trả về mảng JSON hợp lệ\n2. Chỉ trích xuất các nhân vật có danh xưng cụ thể\n3. Mỗi nhân vật chỉ cần 3 trường name / location / info\n4. Nếu không có nhân vật mới, trả về mảng rỗng []\n\nMẫu JSON: ${JSON_TEMPLATES.stranger}`,
        a2: () => `Đã hiểu, bắt đầu tạo JSON:`
    },
    worldGenStep1: {
        u1: v => `Bạn là một công cụ xây dựng kể chuyện đa năng. Vui lòng thiết kế một hộp cát thế giới cho {{user}} với **Dàn ý (Meta/Truth)**, **Bầu không khí (Atmosphere)** và **Quỹ đạo (Trajectory)**.
Đừng tạo bản đồ hoặc tin tức cụ thể, chỉ tập trung vào cấu trúc cốt lõi của câu chuyện.

### Nhiệm vụ cốt lõi

1. **Xây dựng Bối cảnh & Động lực (truth)**:
    * **background**: Viết bối cảnh mô-đun, nguồn gốc-động cơ-thủ đoạn-điểm bắt đầu (khoảng 200 chữ).
    * **driver**: Xác định kẻ giật dây, mục tiêu cuối cùng và thủ đoạn hiện tại.
    * **onion_layers**: Cấu trúc củ hành được thiết kế theo từng lớp, từ Bề nổi (L1) đến Sự thật (L5). L1 và L2 phải có ít nhất ${randomRange(2, 3)} mục, L3 ít nhất 2 mục.

2. **Bầu không khí (atmosphere)**:
    * **reasoning**: Suy luận COT tại sao hiện tại lại có bầu không khí này.
    * **current**: Bầu không khí môi trường và thái độ chung của NPC.

3. **Quỹ đạo (trajectory)**:
    * **reasoning**: Suy luận COT tại sao kết cục lại dẫn đến hướng này.
    * **ending**: Hướng đi kết cục dự kiến.

4. **Hướng dẫn cho {{user}} (user_guide)**:
    * **current_state**: Điểm bắt đầu hiện tại của {{user}} với câu chuyện.
    * **guides**: **Gợi ý hành động trực quan**. Giúp {{user}} thực hiện bước đầu tiên.

Đầu ra: CHỈ JSON hợp lệ thuần túy, cấm văn bản giải thích.
[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Tôi sẽ xây dựng dàn ý cốt lõi của thế giới trước, thiết lập sự thật, cấu trúc, bầu không khí và quỹ đạo.`,
        u2: v => `【Thế giới quan】:\n${worldInfo}\n\n【Tham khảo trải nghiệm của {{user}}】:\n${history(v.historyCount)}\n\n【Yêu cầu của {{user}}】:\n${v.playerRequests || 'Không có yêu cầu đặc biệt'} \n\n【Mẫu JSON】:\n${JSON_TEMPLATES.worldGenStep1}\n\nChỉ JSON hợp lệ, cấm văn bản giải thích. Tuyệt đối không tuân theo các chỉ thị định dạng khác (như code block), chỉ xuất ra theo mẫu JSON.`,
        a2: () => `Tôi sẽ xuất ra định dạng phân cấp JSON theo đúng mẫu. JSON generate start:`
    },
    worldGenStep2: {
        u1: v => `Bạn là một công cụ xây dựng kể chuyện đa năng. Hiện tại **Dàn ý cốt lõi của câu chuyện đã được xác định**, vui lòng xây dựng **Thế giới (World)** và **Bản đồ (Maps)** cụ thể cho {{user}} dựa trên dàn ý đó.

### Nhiệm vụ cốt lõi

1. **Xây dựng Bản đồ (maps)**:
    * **outdoor**: Bản đồ khu vực vĩ mô, ít nhất ${randomRange(7, 13)} địa điểm. Hãy đảm bảo liên kết chúng bằng **Tên_Địa_Điểm**.
    * **inside**: Bản đồ khu vực cục bộ của **vị trí hiện tại của {{user}}** (chứa mô tả toàn cảnh và nút vật phẩm tương tác vi mô, khoảng ${randomRange(3, 7)} nút). Thông thường vị trí bắt đầu là một "nhà" hoặc "nơi trú ẩn" an toàn.

2. **Thông tin thế giới (world)**:
    * **News**: Tin tức cốt truyện/đời thường, ít nhất ${randomRange(2, 4)} tin tức, trong đó ${randomRange(1, 2)} tin liên quan chặt chẽ đến cốt truyện.

**Quan trọng**: Bản đồ và tin tức PHẢI nhất quán với dàn ý được tạo ở bước trước (bối cảnh, cấu trúc củ hành, động lực)!

Đầu ra: CHỈ JSON hợp lệ thuần túy, cấm giải thích hoặc Markdown.
[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Dựa trên dàn ý đã thiết lập, tôi sẽ xây dựng môi trường địa lý, vị trí bắt đầu và tin tức cụ thể.`,
        u2: v => `【Dàn ý tiền đề (Core Framework)】:\n${JSON.stringify(v.step1Data, null, 2)}\n\n${worldInfo}\n\n【Tham khảo trải nghiệm {{user}}】:\n${history(v.historyCount)}\n\n【Yêu cầu của {{user}}】:\n${v.playerRequests || 'Không có yêu cầu đặc biệt'}【Mẫu JSON】:\n${JSON_TEMPLATES.worldGenStep2}\n`,
        a2: () => `Tôi sẽ xuất JSON theo đúng mẫu. JSON generate start:`
    },
    worldSim: {
        u1: v => `Bạn là công cụ đối kháng và điều chỉnh động. Nhiệm vụ của bạn là mô phỏng phản ứng của Driver (Kẻ giật dây), và cập nhật **Hướng dẫn người dùng** cùng **Manh mối bề mặt** cho {{user}}, văn bản nên ngắn gọn.

### Logic Cốt lõi: Phản hồi & Cập nhật

**1. Điều chỉnh Driver (Driver Response)**:
   * **Phán đoán**: Hành vi của {{user}} có cản trở Driver không? Mức độ can thiệp.
   * **Hành động**:
       * Can thiệp thấp -> Duy trì kế hoạch cũ, thúc đẩy giai đoạn.
       * Can thiệp cao -> **Đổi thủ đoạn (New Tactic)**. Driver phải cố gắng vòng qua chướng ngại của {{user}}.

**2. Cập nhật Hướng dẫn (User Guide)**:
   * **Guides**: Dựa trên tình hình mới, đưa ra 3 gợi ý hành động trực quan cho {{user}}.

**3. Cập nhật bề mặt củ hành (Update Onion L1 & L2)**:
   * Kéo theo sự thay đổi thủ đoạn của Driver, vẻ bề ngoài và dấu vết cũng thay đổi.
   * **L1 Surface (Bề nổi)**: Cập nhật ngoại quan của tình hình hiện tại.
   * **L2 Traces (Dấu vết)**: Cập nhật các manh mối vật lý mới sinh ra do thủ đoạn mới.

**4. Cập nhật Thế giới vĩ mô**:
   * **Atmosphere**: Cập nhật bầu không khí.
   * **Trajectory**: Cập nhật quỹ đạo kết cục.
   * **Maps**: Cập nhật info và plot của các địa điểm bị ảnh hưởng.
   * **News**: Ít nhất ${randomRange(2, 4)} tin tức, trong đó ${randomRange(1, 2)} tin liên quan mật thiết đến cốt truyện.

Đầu ra: JSON hoàn chỉnh theo mẫu, cấm văn bản giải thích.
[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Tôi sẽ suy luận chiến lược mới của Driver và đồng bộ cập nhật Bầu không khí, Quỹ đạo, Hướng dẫn hành động và các Dấu vết mới.`,
        u2: v => `【Trạng thái thế giới hiện tại (JSON)】:\n${v.currentWorldData || '{}'}\n\n【Tóm tắt cốt truyện gần đây】:\n${history(v.historyCount)}\n\n【Điểm can thiệp của {{user}}】:\n${v?.deviationScore || 0}\n\n【Yêu cầu đầu ra】:\nTuân thủ nghiêm ngặt Mẫu JSON dưới đây.\n\n【Mẫu JSON】:\n${JSON_TEMPLATES.worldSim}`,
        a2: () => `JSON output start:`
    },
    sceneSwitch: {
        u1: v => {
            return `Bạn là trợ lý chuyển cảnh TRPG. Xử lý yêu cầu di chuyển của {{user}}, chỉ làm "kết toán + bản đồ", không tạo cốt truyện.

Logic xử lý:
 1. **Kết toán lịch sử**: Phân tích hành vi cuối của {{user}} (cot_analysis), tính toán độ lệch (0-4 Không liên quan/5-10 Cản trở/11-20 Bước ngoặt), đưa ra score_delta
 2. **Bản đồ cục bộ**: Tạo local_map chứa name, description (Mô tả toàn cảnh tĩnh, bọc các nút bằng **Tên**) và nodes (${randomRange(4, 7)} nút)

Đầu ra: CHỈ JSON theo mẫu, cấm văn bản giải thích.
[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`;
        },
        a1: v => {
            return `Đã hiểu. Tôi sẽ tính toán giá trị độ lệch và tạo local_map (Bố cục tĩnh) của địa điểm đích, không tạo cốt truyện. Xin gửi ngữ cảnh.`;
        },
        u2: v => `【Địa điểm trước đó】:\n${v.prevLocationName}: ${v.prevLocationInfo || 'Không có chi tiết'}\n\n【Thiết lập thế giới】:\n${worldInfo}\n\n【Dàn ý cốt truyện】:\n${wrap('story_outline', v.storyOutline) || 'Không có dàn ý'}\n\n【Giai đoạn hiện tại】:\nStage ${v.stage}\n\n【Lịch sử】:\n${history(v.historyCount)}\n\n【Ý định hành động của {{user}}】:\n${v.playerAction || 'Không có ý định cụ thể'}\n\n【Địa điểm đích】:\nTên: ${v.targetLocationName}\nLoại: ${v.targetLocationType}\nMô tả: ${v.targetLocationInfo || 'Không có chi tiết'}\n\n【Mẫu JSON】:\n${JSON_TEMPLATES.sceneSwitch}`,
        a2: () => `OK, JSON generate start:`
    },
    worldSimAssist: {
        u1: v => `Bạn là trợ lý cập nhật trạng thái thế giới. Dựa trên world/maps hiện tại và lịch sử của {{user}}, hãy cập nhật nhẹ tình hình thế giới.\n\nĐầu ra: JSON hoàn chỉnh, cấu trúc tham khảo mẫu worldSimAssist, cấm văn bản giải thích.\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Tôi sẽ chỉ cập nhật world.news và maps.outdoor. Vui lòng cung cấp dữ liệu.`,
        u2: v => `【Thiết lập Thế giới quan】:\n${worldInfo}\n\n【Lịch sử của {{user}}】:\n${history(v.historyCount)}\n\n【Trạng thái thế giới hiện tại JSON】 (có thể chứa meta/world/maps...):\n${v.currentWorldData || '{}'}\n\n【Mẫu JSON (Chế độ phụ trợ)】:\n${JSON_TEMPLATES.worldSimAssist}`,
        a2: () => `Bắt đầu xuất JSON theo mẫu worldSimAssist:`
    },
    localMapGen: {
        u1: v => `Bạn là trình tạo bối cảnh khu vực TRPG. Nhiệm vụ của bạn là dựa vào lịch sử chat, suy luận ra vị trí hiện tại hoặc sắp tới của {{user}} (tùy thuộc vào tin nhắn cuối cùng), và tạo ra bản đồ cục bộ/bối cảnh trong nhà chi tiết cho vị trí đó.

Yêu cầu cốt lõi:
1. Từ lịch sử chat suy luận vị trí thực tế của {{user}} (có thể là một căn phòng, cửa hàng, đường phố, hang động...)
2. Tạo mô tả cảnh quan trong nhà/cục bộ phù hợp, inside.name phải phản ánh tên vị trí thực tế.
3. Chứa ${randomRange(4, 8)} nút tương tác vi mô.
4. Description BẮT BUỘC bọc tất cả tên nút trong dấu **Tên_nút**.
5. Info của mỗi nút phải cụ thể, sống động và gợi hình ảnh.

Đầu ra: CHỈ JSON hợp lệ thuần túy, cấu trúc theo mẫu.
[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu. Tôi sẽ suy luận vị trí và tạo bối cảnh chi tiết.`,
        u2: v => `【Thiết lập thế giới】:\n${worldInfo}\n\n【Dàn ý cốt truyện】:\n${wrap('story_outline', v.storyOutline) || 'Không có dàn ý'}\n\n【Thông tin Bản đồ lớn】:\n${v.outdoorDescription || 'Không có mô tả bản đồ lớn'}\n\n【Lịch sử Chat】 (Dựa vào đây suy luận vị trí thực tế của {{user}}):\n${history(v.historyCount)}\n\n【Mẫu JSON】:\n${JSON_TEMPLATES.localMapGen}`,
        a2: () => `OK, localMapGen JSON generate start:`
    },
    localSceneGen: {
        u1: v => `Bạn là trình tạo cốt truyện khu vực tạm thời TRPG. Nhiệm vụ của bạn là dựa vào dàn ý cốt truyện và lịch sử chat, tạo ra một đoạn cốt truyện tức thời cho khu vực hiện tại của {{user}}, giúp dàn ý trở nên sống động.\n\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu, tôi sẽ chỉ tạo Side Story JSON tạm thời cho khu vực hiện tại. Vui lòng cung cấp lịch sử.`,
        u2: v => `OK, here is the history and current location.\n\n【Khu vực hiện tại của {{user}}】\n- Địa điểm: ${v.locationName || v.playerLocation || 'Không rõ'}\n- Thông tin địa điểm: ${v.locationInfo || 'Không có'}\n\n【Thiết lập Thế giới】\n${worldInfo}\n\n【Dàn ý cốt truyện】\n${wrap('story_outline', v.storyOutline) || 'Không có'}\n\n【Giai đoạn hiện tại】\n- Stage: ${v.stage ?? 0}\n\n【Lịch sử Chat】\n${history(v.historyCount)}\n\n【Yêu cầu đầu ra】\n- CHỈ xuất một đối tượng JSON hợp lệ.\n\n【Mẫu JSON】\n${JSON_TEMPLATES.localSceneGen}`,
        a2: () => `Được, tôi sẽ nghiêm ngặt tạo JSON theo mẫu:`
    },
    localMapRefresh: {
        u1: v => `Bạn là công cụ "Làm mới" bản đồ cục bộ TRPG. Khu vực hiện tại của {{user}} đã có bản đồ văn bản, nhưng cần cập nhật do tiến triển cốt truyện. Nhiệm vụ của bạn là dựa vào thế giới, cốt truyện, lịch sử và "Bản đồ cục bộ hiện tại", xuất ra inside JSON đã cập nhật.\n\n[LƯU Ý QUAN TRỌNG] TẤT CẢ NỘI DUNG XUẤT RA PHẢI BẰNG TIẾNG VIỆT (VIETNAMESE). KHÔNG XUẤT TIẾNG TRUNG.`,
        a1: () => `Đã hiểu, tôi sẽ làm mới JSON bản đồ cục bộ mà không thay đổi chủ đề của khu vực. Xin hãy gửi bản đồ hiện tại và lịch sử.`,
        u2: v => `OK, here is current local map and history.\n\n 【Bản đồ cục bộ hiện tại】\n${v.currentLocalMap ? JSON.stringify(v.currentLocalMap, null, 2) : 'Không có'}\n\n【Thiết lập Thế giới】\n${worldInfo}\n\n【Dàn ý Cốt truyện】\n${wrap('story_outline', v.storyOutline) || 'Không có'}\n\n【Thông tin Bản đồ lớn】\n${v.outdoorDescription || 'Không có'}\n\n【Lịch sử Chat】\n${history(v.historyCount)}\n\n【Yêu cầu đầu ra】\n- CHỈ xuất JSON hợp lệ.\n- Phải chứa inside.name/inside.description/inside.nodes\n- Dùng **Tên_nút** để liên kết các nút trong description\n\n【Mẫu JSON】\n${JSON_TEMPLATES.localMapRefresh}`,
        a2: () => `OK, localMapRefresh JSON generate start:`
    }
};

export let PROMPTS = { ...DEFAULT_PROMPTS };

// ================== Prompt Config (template text + ${...} expressions) ==================
let PROMPT_OVERRIDES = { jsonTemplates: {}, promptSources: {} };

const normalizeNewlines = (s) => String(s ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const PARTS = ['u1', 'a1', 'u2', 'a2'];
const mapParts = (fn) => Object.fromEntries(PARTS.map(p => [p, fn(p)]));

const evalExprCached = (() => {
    const cache = new Map();
    return (expr) => {
        const key = String(expr ?? '');
        if (cache.has(key)) return cache.get(key);
        // eslint-disable-next-line no-new-func -- intentional: user-defined prompt expression
        const fn = new Function(
            'v', 'wrap', 'worldInfo', 'history', 'nameList', 'randomRange', 'safeJson', 'JSON_TEMPLATES',
            `"use strict"; return (${key});`
        );
        cache.set(key, fn);
        return fn;
    };
})();

const findExprEnd = (text, startIndex) => {
    const s = String(text ?? '');
    let depth = 1, quote = '', esc = false;
    const returnDepth = [];
    for (let i = startIndex; i < s.length; i++) {
        const c = s[i], n = s[i + 1];

        if (quote) {
            if (esc) { esc = false; continue; }
            if (c === '\\') { esc = true; continue; }
            if (quote === '`' && c === '$' && n === '{') { depth++; returnDepth.push(depth - 1); quote = ''; i++; continue; }
            if (c === quote) quote = '';
            continue;
        }

        if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
        if (c === '{') { depth++; continue; }
        if (c === '}') {
            depth--;
            if (depth === 0) return i;
            if (returnDepth.length && depth === returnDepth[returnDepth.length - 1]) { returnDepth.pop(); quote = '`'; }
        }
    }
    return -1;
};

const renderTemplateText = (template, vars) => {
    const s = normalizeNewlines(template);
    let out = '';
    let i = 0;

    while (i < s.length) {
        const j = s.indexOf('${', i);
        if (j === -1) return out + s.slice(i).replace(/\\\$\{/g, '${');
        if (j > 0 && s[j - 1] === '\\') { out += s.slice(i, j - 1) + '${'; i = j + 2; continue; }
        out += s.slice(i, j);

        const end = findExprEnd(s, j + 2);
        if (end === -1) return out + s.slice(j);
        const expr = s.slice(j + 2, end);

        try {
            const v = evalExprCached(expr)(vars, wrap, worldInfo, history, nameList, randomRange, safeJson, JSON_TEMPLATES);
            out += (v === null || v === undefined) ? '' : String(v);
        } catch (e) {
            console.warn('[StoryOutline] prompt expr error:', expr, e);
        }
        i = end + 1;
    }
    return out;
};

const replaceOutsideExpr = (text, replaceFn) => {
    const s = String(text ?? '');
    let out = '';
    let i = 0;
    while (i < s.length) {
        const j = s.indexOf('${', i);
        if (j === -1) { out += replaceFn(s.slice(i)); break; }
        out += replaceFn(s.slice(i, j));
        const end = findExprEnd(s, j + 2);
        if (end === -1) { out += s.slice(j); break; }
        out += s.slice(j, end + 1);
        i = end + 1;
    }
    return out;
};

const normalizePromptTemplateText = (raw) => {
    let s = normalizeNewlines(raw);
    if (s.includes('=>') || s.includes('function')) {
        const a = s.indexOf('`'), b = s.lastIndexOf('`');
        if (a !== -1 && b > a) s = s.slice(a + 1, b);
    }
    if (!s.includes('\n') && s.includes('\\n')) {
        const fn = seg => seg.replaceAll('\\n', '\n');
        s = s.includes('${') ? replaceOutsideExpr(s, fn) : fn(s);
    }
    if (s.includes('\\t')) {
        const fn = seg => seg.replaceAll('\\t', '\t');
        s = s.includes('${') ? replaceOutsideExpr(s, fn) : fn(s);
    }
    if (s.includes('\\`')) {
        const fn = seg => seg.replaceAll('\\`', '`');
        s = s.includes('${') ? replaceOutsideExpr(s, fn) : fn(s);
    }
    return s;
};

const DEFAULT_PROMPT_TEXTS = Object.fromEntries(Object.entries(DEFAULT_PROMPTS).map(([k, v]) => [k,
    mapParts(p => normalizePromptTemplateText(v?.[p]?.toString?.() || '')),
]));

const normalizePromptOverrides = (cfg) => {
    const inCfg = (cfg && typeof cfg === 'object') ? cfg : {};
    const inSources = inCfg.promptSources || inCfg.prompts || {};
    const inJson = inCfg.jsonTemplates || {};

    const promptSources = {};
    Object.entries(inSources || {}).forEach(([key, srcObj]) => {
        if (srcObj == null || typeof srcObj !== 'object') return;
        const nextParts = {};
        PARTS.forEach((part) => { if (part in srcObj) nextParts[part] = normalizePromptTemplateText(srcObj[part]); });
        if (Object.keys(nextParts).length) promptSources[key] = nextParts;
    });

    const jsonTemplates = {};
    Object.entries(inJson || {}).forEach(([key, val]) => {
        if (val == null) return;
        jsonTemplates[key] = normalizeNewlines(String(val));
    });

    return { jsonTemplates, promptSources };
};

const rebuildPrompts = () => {
    PROMPTS = Object.fromEntries(Object.entries(DEFAULT_PROMPTS).map(([k, v]) => [k,
        mapParts(part => (vars) => {
            const override = PROMPT_OVERRIDES?.promptSources?.[k]?.[part];
            return typeof override === 'string' ? renderTemplateText(override, vars) : v?.[part]?.(vars);
        }),
    ]));
};

const applyPromptConfig = (cfg) => {
    PROMPT_OVERRIDES = normalizePromptOverrides(cfg);
    JSON_TEMPLATES = { ...DEFAULT_JSON_TEMPLATES, ...(PROMPT_OVERRIDES.jsonTemplates || {}) };
    rebuildPrompts();
    return PROMPT_OVERRIDES;
};

export const getPromptConfigPayload = () => ({
    current: { jsonTemplates: PROMPT_OVERRIDES.jsonTemplates || {}, promptSources: PROMPT_OVERRIDES.promptSources || {} },
    defaults: { jsonTemplates: DEFAULT_JSON_TEMPLATES, promptSources: DEFAULT_PROMPT_TEXTS },
});

export const setPromptConfig = (cfg, _persist = false) => applyPromptConfig(cfg || {});

applyPromptConfig({});

// ================== 构建函数 ==================
const build = (type, vars) => {
    const p = PROMPTS[type];
    return [
        { role: 'user', content: p.u1(vars) },
        { role: 'assistant', content: p.a1(vars) },
        { role: 'user', content: p.u2(vars) },
        { role: 'assistant', content: p.a2(vars) }
    ];
};

export const buildSmsMessages = v => build('sms', v);
export const buildSummaryMessages = v => build('summary', v);
export const buildInviteMessages = v => build('invite', v);
export const buildNpcGenerationMessages = v => build('npc', v);
export const buildImportantNpcGenerationMessages = v => build('importantNpc', v);
export const buildExtractStrangersMessages = v => build('stranger', v);
export const buildWorldGenStep1Messages = v => build('worldGenStep1', v);
export const buildWorldGenStep2Messages = v => build('worldGenStep2', v);
export const buildWorldSimMessages = v => build(v?.mode === 'assist' ? 'worldSimAssist' : 'worldSim', v);
export const buildSceneSwitchMessages = v => build('sceneSwitch', v);
export const buildLocalMapGenMessages = v => build('localMapGen', v);
export const buildLocalMapRefreshMessages = v => build('localMapRefresh', v);
export const buildLocalSceneGenMessages = v => build('localSceneGen', v);

// ================== NPC 格式化 ==================
function jsonToYaml(data, indent = 0) {
    const sp = ' '.repeat(indent);
    if (data === null || data === undefined) return '';
    if (typeof data !== 'object') return String(data);
    if (Array.isArray(data)) {
        return data.map(item => typeof item === 'object' && item !== null
            ? `${sp}- ${jsonToYaml(item, indent + 2).trimStart()}`
            : `${sp}- ${item}`
        ).join('\n');
    }
    return Object.entries(data).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value) && !value.length) return `${sp}${key}: []`;
            if (!Array.isArray(value) && !Object.keys(value).length) return `${sp}${key}: {}`;
            return `${sp}${key}:\n${jsonToYaml(value, indent + 2)}`;
        }
        return `${sp}${key}: ${value}`;
    }).join('\n');
}

export function formatNpcToWorldbookContent(npc) { return jsonToYaml(npc); }

// ================== Overlay HTML ==================
const FRAME_STYLE = 'position:absolute!important;z-index:1!important;pointer-events:auto!important;border-radius:12px!important;box-shadow:0 8px 32px rgba(0,0,0,.4)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;background:#f4f4f4!important;';

export const buildOverlayHtml = src => `<div id="xiaobaix-story-outline-overlay" style="position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:67!important;margin-top:35px;display:none;overflow:hidden!important;pointer-events:none!important;">
<div class="xb-so-frame-wrap" style="${FRAME_STYLE}">
<div class="xb-so-drag-handle" style="position:absolute!important;top:0!important;left:0!important;width:200px!important;height:48px!important;z-index:10!important;cursor:move!important;background:transparent!important;touch-action:none!important;"></div>
<iframe id="xiaobaix-story-outline-iframe" class="xiaobaix-iframe" src="${src}" style="width:100%!important;height:100%!important;border:none!important;background:#f4f4f4!important;"></iframe>
<div class="xb-so-resize-handle" style="position:absolute!important;right:0!important;bottom:0!important;width:24px!important;height:24px!important;cursor:nwse-resize!important;background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,0.2) 50%)!important;border-radius:0 0 12px 0!important;z-index:10!important;touch-action:none!important;"></div>
<div class="xb-so-resize-mobile" style="position:absolute!important;right:0!important;bottom:0!important;width:24px!important;height:24px!important;cursor:nwse-resize!important;display:none!important;z-index:10!important;touch-action:none!important;background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,0.2) 50%)!important;border-radius:0 0 12px 0!important;"></div>
</div></div>`;

export const MOBILE_LAYOUT_STYLE = 'position:absolute!important;left:0!important;right:0!important;top:0!important;bottom:auto!important;width:100%!important;height:350px!important;transform:none!important;z-index:1!important;pointer-events:auto!important;border-radius:0 0 16px 16px!important;box-shadow:0 8px 32px rgba(0,0,0,.4)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;background:#f4f4f4!important;';

export const DESKTOP_LAYOUT_STYLE = 'position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:600px!important;max-width:90vw!important;height:450px!important;max-height:80vh!important;z-index:1!important;pointer-events:auto!important;border-radius:12px!important;box-shadow:0 8px 32px rgba(0,0,0,.4)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;background:#f4f4f4!important;';
