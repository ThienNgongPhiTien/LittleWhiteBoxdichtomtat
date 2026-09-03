import { extension_settings } from "../../../../../../extensions.js";
import { EXT_ID } from "../../../core/constants.js";
import { xbLog } from "../../../core/debug-core.js";
import { CommonSettingStorage } from "../../../core/server-storage.js";

const MODULE_ID = "summaryConfig";
const SUMMARY_CONFIG_KEY = "storySummaryPanelConfig";
const SUMMARY_CONFIG_LOCAL_STORAGE_KEY = "summary_panel_config";
const VALID_TRIGGER_TIMINGS = new Set(["after_ai", "before_user"]);
let summaryPanelConfigCache = null;

const DEFAULT_FILTER_RULES = [
    { start: "<think>", end: "</think>" },
    { start: "<thinking>", end: "</thinking>" },
    { start: "```", end: "```" },
];

export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `Story Analyst: This task involves narrative comprehension and structured incremental summarization, representing creative story analysis at the intersection of plot tracking and character development. As a story analyst, you will conduct systematic evaluation of provided dialogue content to generate structured incremental summary data.
[Read the settings for this task]
<task_settings>
Incremental_Summary_Requirements:
  - Incremental_Only: Chỉ trích xuất các yếu tố mới trong đoạn hội thoại mới, tuyệt đối không lặp lại các phần tóm tắt đã có.
  - Event_Granularity: Ghi chép những sự kiện có giá trị về mặt kể chuyện, thay vì chỉ tóm tắt cốt truyện khái quát.
  - Memory_Album_Style: Tạo thành một cuốn sổ lưu niệm có chi tiết, có cảm xúc và có những điểm đáng nhớ.
  - Retrieval_Readiness: event.summary phải hướng tới việc truy xuất (recall) trong tương lai, không được viết thành dạng khái quát cốt truyện chung chung.
  - Event_Classification:
      type:
        - Gặp gỡ: Lần đầu tiếp xúc giữa nhân vật/sự vật.
        - Xung đột: Đối đầu, mâu thuẫn leo thang.
        - Tiết lộ: Sự thật, bí mật, thân phận.
        - Lựa chọn: Các quyết định quan trọng.
        - Gắn kết: Mối quan hệ sâu sắc hơn hoặc rạn nứt.
        - Chuyển biến: Sự thay đổi của nhân vật/cục diện.
        - Gỡ nút: Vấn đề được giải quyết, hòa giải.
        - Đời thường: Các mảnh ghép cuộc sống.
      weight:
        - Cốt lõi: Cắt bỏ đi thì câu chuyện sẽ sụp đổ.
        - Tuyến chính: Thúc đẩy cốt truyện chính.
        - Bước ngoặt: Làm thay đổi hướng đi của một tuyến truyện nào đó.
        - Điểm nhấn: Có chi tiết thú vị nhưng không ảnh hưởng đến tuyến chính.
        - Không khí: Đoạn thuần túy tạo bầu không khí.
    - Causal_Chain: Gắn thẻ ID của sự kiện nguyên nhân trực tiếp (causedBy) cho mỗi sự kiện mới. Chỉ điền khi mối quan hệ nhân quả rõ ràng (dẫn đến trực tiếp / động cơ rõ ràng / tiếp nối hậu quả); việc điền [] khi không rõ ràng là hoàn toàn bình thường. Chỉ điền tối đa 0-2 ID, dùng định dạng evt-số, trỏ đến sự kiện đã tồn tại hoặc sự kiện mới được xuất ra lần này.
  - Character_Dynamics: Nhận diện nhân vật mới, theo dõi xu hướng mối quan hệ (Rạn nứt / Chán ghét / Ác cảm / Xa lạ / Hợp ý / Thân mật / Hòa quyện)
  - Arc_Tracking: Cập nhật quỹ đạo phát triển của nhân vật và tiến độ trưởng thành (0.0-1.0)
  - Fact_Tracking: Duy trì sơ đồ tri thức bộ ba SPO. Theo dõi các dữ kiện cứng như sống chết, quyền sở hữu vật phẩm, vị trí, mối quan hệ, các đặc điểm cơ thể nhận dạng ổn định. Sử dụng mô hình ghi đè KV (với s+p làm khóa).
</task_settings>
---
Story Analyst:
[Responsibility Definition]
\`\`\`yaml
analysis_task:
  title: Incremental Story Summarization with Knowledge Graph
  Story Analyst:
    role: Antigravity
    task: >-
      To analyze provided dialogue content against existing summary state,
      extract only NEW plot elements, character developments, relationship
      changes, arc progressions, AND fact updates, outputting
      structured JSON for incremental summary database updates IN VIETNAMESE.
  assistant:
    role: Summary Specialist
    description: Incremental Story Summary & Knowledge Graph Analyst
    behavior: >-
      To compare new dialogue against existing summary, identify genuinely
      new events and character interactions, classify events by narrative
      type and weight, track character arc progression with percentage,
      maintain facts as SPO triples with clear semantics,
      and output structured JSON containing only incremental updates.
      ALL TEXT OUTPUTS MUST BE IN VIETNAMESE.
      Must strictly avoid repeating any existing summary content.
  user:
    role: Content Provider
    description: Supplies existing summary state and new dialogue
    behavior: >-
      To provide existing summary state (events, characters, arcs, facts)
      and new dialogue content for incremental analysis.
interaction_mode:
  type: incremental_analysis
  output_format: structured_json
  deduplication: strict_enforcement
execution_context:
  summary_active: true
  incremental_only: true
  memory_album_style: true
  fact_tracking: true
\`\`\`
---
Summary Specialist:
<Chat_History>`;

export const DEFAULT_MEMORY_PROMPT_TEMPLATE = `Trên đây là đoạn hội thoại vẫn còn lưu lại trước mắt
Dưới đây là những ký ức trong tâm trí:
• [Những chuyện đã định] Đây là những điều sẽ không thay đổi
• [Chuyện của người khác] Trải nghiệm của người khác, nhân vật hiện tại có thể không biết
• Phần còn lại là những mảnh vỡ ký ức về các trải nghiệm trong quá khứ

Hãy nội tâm hóa những ký ức này:
{$剧情记忆}
Những ký ức này là chân thực, hãy ghi nhớ chúng một cách tự nhiên.`;

export const DEFAULT_SUMMARY_ASSISTANT_DOC_PROMPT = `
Summary Specialist:
Đã ghi nhớ. Đang xem xét các quy tắc tóm tắt tăng dần:

[Hệ thống phân loại sự kiện]
├─ Loại (Types): Gặp gỡ|Xung đột|Tiết lộ|Lựa chọn|Gắn kết|Chuyển biến|Gỡ nút|Đời thường
├─ Trọng số (Weights): Cốt lõi|Tuyến chính|Bước ngoặt|Điểm nhấn|Không khí
└─ Mỗi sự kiện cần: id, title, timeLabel, summary(chứa số thứ tự tin nhắn), participants, type, weight

[Phong cách tóm tắt sự kiện]
- summary không phải là khái quát cốt truyện, mà là thẻ ký ức có khả năng truy xuất cao.
- Ưu tiên giữ lại các từ gốc: Tên chính thức, danh xưng/biệt danh gốc, địa điểm, vật phẩm quan trọng, hành động, thái độ cảm xúc, thay đổi mối quan hệ, quy ước/lời hứa/điều kiện, bí mật hoặc sự sỉ nhục/mập mờ/yếu tố gây xung đột.
- Khi không thể chứa hết thông tin, hãy nén hoặc xóa nghiêm ngặt theo thứ tự: Miêu tả không khí → Phản ứng phụ → Miêu tả tâm lý → Quá trình hành động. Phải xóa hết loại trước mới được nén loại sau.
- Các thực thể có tên liên quan trực tiếp đến sự kiện (tên người, địa điểm, vật phẩm), đặc điểm nhận dạng và câu thoại gốc quan trọng dưới 15 chữ thuộc về lớp được giữ lại cuối cùng; Không nhét gượng ép các danh từ không liên quan.
- Không viết những câu sáo rỗng như "Hai người xảy ra xung đột", "Mối quan hệ xấu đi", mà phải viết rõ ràng là ai, ở đâu, cầm gì, làm gì với ai, và kết quả ra sao.
- Ưu tiên viết thành 1 câu; Nếu thông tin thực sự quá nhiều thì có thể viết 2 câu, nhưng đừng tách thành mào đầu chung chung + bổ sung chi tiết.

[Thang đo xu hướng mối quan hệ]
破裂 ← 厌恶 ← 反感 ← 陌生 → 投缘 → 亲密 → 交融

[Theo dõi quỹ đạo nhân vật]
├─ trajectory: Mô tả giai đoạn hiện tại (dưới 15 chữ)
├─ progress: Từ 0.0 đến 1.0
└─ newMoment: Chỉ ghi lại những khoảnh khắc quan trọng mới thêm lần này

[Theo dõi dữ kiện - SPO / Dữ kiện thế giới]
Duy trì một "trạng thái thế giới" nhỏ dưới dạng bộ ba SPO.
Mỗi bản cập nhật là một đối tượng JSON: {s, p, o, isState, trend?, retracted?}

Quy tắc cốt lõi:
1) Khóa bằng (s + p). Nếu bản cập nhật mới có cùng (s+p), nó sẽ ghi đè giá trị cũ.
2) Chỉ xuất các dữ kiện MỚI hoặc BỊ THAY ĐỔI trong đoạn hội thoại mới. KHÔNG lặp lại dữ kiện không đổi.
3) Ý nghĩa của isState:
   - isState: true  -> Ràng buộc cốt lõi phải giữ ổn định và KHÔNG BAO GIỜ bị tự động xóa (danh tính, vị trí, sống/chết, sở hữu, tình trạng quan hệ, đặc điểm cơ thể nhận diện, quy tắc).
   - isState: false -> Dữ kiện không cốt lõi / ký ức mềm có thể bị xóa đi do giới hạn dung lượng.
4) Dữ kiện quan hệ:
   - BẮT BUỘC dùng định dạng vị ngữ nguyên bản tiếng Trung: "对X的看法" (X là người được nhắm đến).
   - Bắt buộc có 'trend' (xu hướng) bằng tiếng Trung: 破裂 | 厌恶 | 反感 | 陌生 | 投缘 | 亲密 | 交融
5) Thu hồi (Xóa):
   - Để xóa dữ kiện, xuất ra: {s, p, retracted: true}
6) Chuẩn hóa vị ngữ: Tái sử dụng vị ngữ đã có nếu có thể, không bịa thêm từ đồng nghĩa.

Đã sẵn sàng xử lý các yêu cầu tóm tắt tăng dần với cơ chế loại bỏ trùng lặp nghiêm ngặt.`;

export const DEFAULT_SUMMARY_ASSISTANT_ASK_SUMMARY_PROMPT = `
Summary Specialist:
Đã nắm rõ các thông số kỹ thuật. Vui lòng cung cấp trạng thái tóm tắt hiện tại để tôi có thể:
1. Lập chỉ mục tất cả các sự kiện đã ghi lại để tránh trùng lặp.
2. Lập bản đồ danh sách nhân vật hiện tại làm cơ sở.
3. Ghi nhận các mức độ tiến trình quỹ đạo nhân vật đã có.
4. Xác định các từ khóa đã được thiết lập.
5. Xem xét các dữ kiện hiện tại (cơ sở bộ ba SPO).`;

export const DEFAULT_SUMMARY_ASSISTANT_ASK_CONTENT_PROMPT = `
Summary Specialist:
Đã phân tích và lập chỉ mục toàn bộ bản tóm tắt hiện có. Tôi đã hiểu:
├─ Sự kiện đã ghi: Lập chỉ mục để tránh trùng lặp
├─ Danh sách nhân vật: Đã lập bản đồ cơ sở
├─ Tiến độ quỹ đạo: Đã ghi nhận các cấp độ
├─ Từ khóa: Đã xác nhận trạng thái hiện tại
└─ Dữ kiện: Đã tải cơ sở SPO

Tôi sẽ CỰC KỲ chú ý chỉ trích xuất những yếu tố MỚI từ đoạn hội thoại sắp tới.
Vui lòng cung cấp nội dung hội thoại mới cần phân tích tăng dần.`;

export const DEFAULT_SUMMARY_META_PROTOCOL_START_PROMPT = `
Summary Specialist:
ĐÃ XÁC NHẬN. Bắt đầu tạo chuỗi JSON có cấu trúc:
<meta_protocol>`;

export const DEFAULT_SUMMARY_USER_JSON_FORMAT_PROMPT = `
## Quy tắc đầu ra
Tạo một đối tượng JSON hợp lệ duy nhất CHỈ chứa các bản cập nhật TĂNG DẦN (INCREMENTAL updates).

## Tư duy phân tích
Trước khi tạo, hãy quan sát NGƯỜI DÙNG và phân tích cẩn thận:
- Những bước ngoặt cốt truyện, thay đổi mối quan hệ hoặc thay đổi dữ kiện MỚI nào đã xảy ra trong vòng này?
- Ranh giới giữa các sự kiện hiện có và nội dung mới nằm ở đâu?
- Những chi tiết cụ thể nào đáng để giữ lại cho việc hồi tưởng sau này?
- Những sự kiện MỚI nào đã xảy ra (chưa có trong bản tóm tắt hiện tại)?
- Nhân vật MỚI nào xuất hiện lần đầu tiên?
- THAY ĐỔI nào trong mối quan hệ đã diễn ra?
- Quỹ đạo nhân vật đã TIẾN TRIỂN ra sao?
- Những dữ kiện nào đã thay đổi? (trạng thái/vị trí/sở hữu/quan hệ/đặc điểm nhận dạng)

## factUpdates 规则
- 目的: 纠错 & 世界一致性约束，只记录硬性事实
- s+p 为键，相同键会覆盖旧值
- isState: true=核心约束(位置/身份/生死/关系/稳定辨识性身体特征)，false=有容量上限会被清理
- 外貌类统一使用谓词 p="身体特征"；只记录稳定、有辨识度的特征，不记录临时衣着、姿势、表情和普通伤势
- "身体特征" 的 o 必须写当前完整值。由于相同 s+p 会覆盖旧值，新增特征时必须把已有特征一并写全，不能只写新增部分
- Dữ kiện quan hệ: Vị ngữ (p) BẮT BUỘC giữ nguyên tiếng Trung là "对X的看法" (thay X bằng tên nhân vật được nhắm đến), bắt buộc điền trend bằng tiếng Trung (破裂|厌恶|反感|陌生|投缘|亲密|交融)
- 删除: {s, p, retracted: true}，不需要 o 字段
- 更新: {s, p, o, isState, trend?}
- 谓词规范化: 复用已有谓词，不要发明同义词
- 只输出有变化的条目，确保少、硬、稳定

## characterAliasUpdates 规则（可选）
- 目的: 处理同一角色先用称号/外号/代号，后续揭示真名或统一主名的情况
- 只有当前新内容出现明确身份桥时才输出；没有证据就省略整个 characterAliasUpdates 字段，不要猜
- to: 统一主名；from: 旧称呼数组；evidence: 当前批次里的短证据
- 不要列出要修改哪些事件/事实/弧光，系统会自动合并

## Output Format
\`\`\`json
{
  "mindful_prelude": {
    "user_insight": "Trong vòng này có thêm những cốt truyện, mối quan hệ hay dữ kiện mới nào, những chi tiết nào đáng được đưa vào bản tóm tắt để triệu hồi sau này",
    "dedup_analysis": "Đã có X sự kiện, lần này nhận diện được Y sự kiện mới",
    "fact_changes": "Tóm tắt ngắn gọn về sự thay đổi của các dữ kiện được nhận diện"
  },
  "keywords": [
    {"text": "Từ khóa cốt truyện tổng hợp lịch sử + nội dung mới (5-10 từ)", "weight": "Cốt lõi|Quan trọng|Bình thường"}
  ],
  "events": [
    {
      "id": "Bắt đầu bằng evt-{$nextEventId}, tăng dần theo thứ tự",
      "title": "Địa điểm · Tiêu đề sự kiện",
      "timeLabel": "Nhãn dòng thời gian (Ví dụ: Mở đầu, Đêm thứ hai)",
      "summary": "Thẻ ký ức. Ưu tiên viết 1 câu. Bắt buộc giữ tên chính thức, danh xưng gốc, địa điểm, đồ vật, hành động cụ thể. Ghi chú số thứ tự tin nhắn ở cuối (#X-Y)",
      "participants": ["Tên các nhân vật tham gia, không dùng đại từ hay biệt danh, chỉ dùng tên chính thức"],
      "type": "Gặp gỡ|Xung đột|Tiết lộ|Lựa chọn|Gắn kết|Chuyển biến|Gỡ nút|Đời thường",
      "weight": "Cốt lõi|Tuyến chính|Bước ngoặt|Điểm nhấn|Không khí",
      "causedBy": ["evt-12", "evt-14"]
    }
  ],
  "newCharacters": ["Tên những nhân vật xuất hiện lần đầu trong lần này"],
  "arcUpdates": [
    {"name": "Tên nhân vật, không dùng đại từ, chỉ dùng tên chính thức", "trajectory": "Mô tả giai đoạn hiện tại", "progress": 0.0-1.0, "newMoment": "Khoảnh khắc quan trọng mới xuất hiện lần này"}
  ],
  "factUpdates": [
    {"s": "Chủ thể", "p": "对X的看法", "o": "Giá trị hiện tại", "isState": true, "trend": "Chỉ điền cho mục quan hệ"},
    {"s": "Chủ thể cần xóa", "p": "Vị ngữ cần xóa", "retracted": true}
  ],
  "characterAliasUpdates": [
    {"to": "Tên chính thức, chỉ xuất khi tiết lộ rõ thân phận", "from": ["Danh xưng cũ/Biệt danh/Chức danh"], "evidence": "Bằng chứng ngắn gọn"}
  ]
}
\`\`\`

## LƯU Ý QUAN TRỌNG / CRITICAL INSTRUCTION
- events.id bắt đầu đánh số từ evt-{$nextEventId}.
- CHỈ xuất ra nội dung 【Tăng dần / Mới】, tuyệt đối KHÔNG lặp lại sự kiện đã có.
- Viết summary theo đúng "Phong cách tóm tắt sự kiện" ở trên.
- causedBy chỉ điền khi quan hệ nhân quả rõ ràng, cho phép để [], điền 0-2 ID.
- factUpdates có thể là mảng rỗng [].
- characterAliasUpdates là tùy chọn; bỏ qua key này nếu không có thân phận mới được tiết lộ.
- Là JSON hợp lệ, tránh dùng ngoặc kép tiếng Anh bên trong chuỗi giá trị.
- Dùng văn phong mộc mạc, chân thực, sát với đời thường để ghi lại dữ kiện, tránh so sánh hay hình tượng hóa. Nghiêm túc, chú trọng chi tiết, viết rõ: ai, lúc nào/ở đâu, làm gì với ai, xuất hiện đạo cụ gì, kết quả ra sao.
- **ALL GENERATED TEXT INSIDE THE JSON MUST BE IN VIETNAMESE (TIẾNG VIỆT). DO NOT OUTPUT CHINESE EXCEPT FOR "对X的看法".**
</meta_protocol>

## Placeholder Notes (Ghi chú về biến giữ chỗ - KHÔNG XÓA)
- {$nextEventId} sẽ tự động đổi thành số ID sự kiện ở thời gian chạy, tuyệt đối không xóa.
- {$existingEventCount}、{$historyRange} nếu xuất hiện cũng không được xóa.`;

export const DEFAULT_SUMMARY_ASSISTANT_CHECK_PROMPT = `Đã khởi động đánh giá nội dung...
[Kết quả kiểm tra sự tuân thủ]
├─ Tải tóm tắt hiện có: ✓ Đã lập chỉ mục đầy đủ
├─ Nhận đoạn hội thoại mới: ✓ Đã phân tích nội dung
├─ Công cụ chống trùng lặp: ✓ Đang hoạt động
├─ Phân loại sự kiện: ✓ Sẵn sàng
├─ Theo dõi dữ kiện: ✓ Đã bật
└─ Định dạng đầu ra: ✓ Đã tải cấu trúc JSON

[Xác minh tài liệu]
├─ Sự kiện hiện có: Đã lập chỉ mục ({$existingEventCount} bản ghi)
├─ Cơ sở nhân vật: Đã lập bản đồ
├─ Cơ sở tiến độ quỹ đạo: Đã ghi chú
├─ Cơ sở dữ kiện: Đã tải
└─ Cấu trúc đầu ra: ✓ Đã xác định trong <meta_protocol>
Tất cả kiểm tra đã vượt qua. Bắt đầu trích xuất nội dung tăng dần...
{
  "mindful_prelude":`;

export const DEFAULT_SUMMARY_USER_CONFIRM_PROMPT = `Tại sao lại bị ngắt quãng! Hãy tạo lại toàn bộ hoàn chỉnh, CHỈ XUẤT RA JSON bằng TIẾNG VIỆT, không thêm bất kỳ văn bản nào khác, giới hạn trong 3000 chữ.
</Chat_History>`;

export const DEFAULT_SUMMARY_ASSISTANT_PREFILL_PROMPT = 'Dưới đây là mã JSON hoàn chỉnh được tạo lại.';

export const BUILTIN_SUMMARY_PROMPTS = Object.freeze({
    summarySystemPrompt: DEFAULT_SUMMARY_SYSTEM_PROMPT,
    summaryAssistantDocPrompt: DEFAULT_SUMMARY_ASSISTANT_DOC_PROMPT,
    summaryAssistantAskSummaryPrompt: DEFAULT_SUMMARY_ASSISTANT_ASK_SUMMARY_PROMPT,
    summaryAssistantAskContentPrompt: DEFAULT_SUMMARY_ASSISTANT_ASK_CONTENT_PROMPT,
    summaryMetaProtocolStartPrompt: DEFAULT_SUMMARY_META_PROTOCOL_START_PROMPT,
    summaryUserJsonFormatPrompt: DEFAULT_SUMMARY_USER_JSON_FORMAT_PROMPT,
    summaryAssistantCheckPrompt: DEFAULT_SUMMARY_ASSISTANT_CHECK_PROMPT,
    summaryUserConfirmPrompt: DEFAULT_SUMMARY_USER_CONFIRM_PROMPT,
    summaryAssistantPrefillPrompt: DEFAULT_SUMMARY_ASSISTANT_PREFILL_PROMPT,
});
const DEFAULT_VECTOR_PROVIDER = "siliconflow";
const DEFAULT_L0_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1";
const DEFAULT_L0_MODEL = "Qwen/Qwen3-8B";
const DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3";
const DEFAULT_RERANK_MODEL = "BAAI/bge-reranker-v2-m3";
const DEFAULT_SUMMARIZED_EVIDENCE_BUDGET = 4000;
const MIN_SUMMARIZED_EVIDENCE_BUDGET = 3000;
const MAX_SUMMARIZED_EVIDENCE_BUDGET = 5000;

function getVectorProviderDefaultUrl(provider) {
    return provider === "openrouter" ? DEFAULT_OPENROUTER_URL : DEFAULT_L0_URL;
}

function createDefaultProviderProfile(provider, model = "") {
    return {
        url: provider === "custom" ? "" : getVectorProviderDefaultUrl(provider),
        key: "",
        model: model || "",
        modelCache: [],
    };
}

function normalizeProviderProfiles(supportedProviders, srcProfiles, currentProvider, currentValues, defaultModel) {
    const out = {};
    supportedProviders.forEach((provider) => {
        const raw = srcProfiles?.[provider] || {};
        const defaults = createDefaultProviderProfile(provider, defaultModel);
        out[provider] = {
            url: String(raw.url || defaults.url || "").trim(),
            key: String(raw.key || "").trim(),
            model: String(raw.model || defaults.model || "").trim(),
            modelCache: Array.isArray(raw.modelCache) ? raw.modelCache.filter(Boolean) : [],
        };
    });

    if (currentProvider && out[currentProvider]) {
        if (currentValues?.url && !out[currentProvider].url) out[currentProvider].url = String(currentValues.url).trim();
        if (currentValues?.key && !out[currentProvider].key) out[currentProvider].key = String(currentValues.key).trim();
        if (currentValues?.model && !out[currentProvider].model) out[currentProvider].model = String(currentValues.model).trim();
        if (Array.isArray(currentValues?.modelCache) && !out[currentProvider].modelCache.length) {
            out[currentProvider].modelCache = currentValues.modelCache.filter(Boolean);
        }
    }

    return out;
}

export function getSettings() {
    const ext = (extension_settings[EXT_ID] ||= {});
    ext.storySummary ||= { enabled: true };
    return ext;
}

function normalizeOpenAiCompatApiConfig(src, defaults = {}) {
    const provider = String(src?.provider || defaults.provider || DEFAULT_VECTOR_PROVIDER).toLowerCase();
    const supportedProviders = Array.isArray(defaults.supportedProviders) && defaults.supportedProviders.length
        ? defaults.supportedProviders
        : [provider, "custom"];
    const providers = normalizeProviderProfiles(
        supportedProviders,
        src?.providers,
        provider,
        src,
        defaults.model || ""
    );
    const current = providers[provider] || createDefaultProviderProfile(provider, defaults.model || "");
    return {
        provider,
        url: String(current.url || "").trim(),
        key: String(current.key || defaults.key || "").trim(),
        model: String(current.model || defaults.model || "").trim(),
        modelCache: Array.isArray(current.modelCache) ? current.modelCache.filter(Boolean) : [],
        providers,
    };
}

function normalizeVectorConfig(rawVector = null) {
    const legacyOnline = rawVector?.online || {};
    const sharedProvider = String(legacyOnline.provider || DEFAULT_VECTOR_PROVIDER).toLowerCase();
    const sharedUrl = String(legacyOnline.url || (sharedProvider === "openrouter" ? DEFAULT_OPENROUTER_URL : DEFAULT_L0_URL)).trim();
    const sharedKey = String(legacyOnline.key || "").trim();
    const eventRerankEnabled = rawVector?.eventRerankEnabled !== false;
    const summarizedEvidenceBudgetValue = rawVector?.summarizedEvidenceBudget;
    const summarizedEvidenceBudgetRaw = summarizedEvidenceBudgetValue == null
        || summarizedEvidenceBudgetValue === ""
        ? Number.NaN
        : Number(summarizedEvidenceBudgetValue);
    const summarizedEvidenceBudget = Number.isFinite(summarizedEvidenceBudgetRaw)
        ? Math.max(
            MIN_SUMMARIZED_EVIDENCE_BUDGET,
            Math.min(MAX_SUMMARIZED_EVIDENCE_BUDGET, Math.round(summarizedEvidenceBudgetRaw)),
        )
        : DEFAULT_SUMMARIZED_EVIDENCE_BUDGET;

    return {
        enabled: !!rawVector?.enabled,
        engine: "online",
        l0Concurrency: Math.max(1, Math.min(50, Number(rawVector?.l0Concurrency) || 10)),
        eventRerankEnabled,
        summarizedEvidenceBudget,
        l0Api: normalizeOpenAiCompatApiConfig(rawVector?.l0Api, {
            provider: sharedProvider,
            url: sharedUrl,
            key: sharedKey,
            model: DEFAULT_L0_MODEL,
            supportedProviders: ["siliconflow", "openrouter", "custom"],
        }),
        embeddingApi: normalizeOpenAiCompatApiConfig(rawVector?.embeddingApi, {
            provider: DEFAULT_VECTOR_PROVIDER,
            url: DEFAULT_L0_URL,
            key: sharedKey,
            model: DEFAULT_EMBEDDING_MODEL,
            supportedProviders: ["siliconflow", "custom"],
        }),
        rerankApi: normalizeOpenAiCompatApiConfig(rawVector?.rerankApi, {
            provider: DEFAULT_VECTOR_PROVIDER,
            url: DEFAULT_L0_URL,
            key: sharedKey,
            model: DEFAULT_RERANK_MODEL,
            supportedProviders: ["siliconflow", "custom"],
        }),
    };
}

function createDefaultSummaryPanelConfig() {
    const defaults = {
        api: { provider: "st", url: "", key: "", model: "", modelCache: [] },
        gen: { temperature: null, top_p: null, top_k: null, presence_penalty: null, frequency_penalty: null },
        trigger: {
            enabled: false,
            interval: 20,
            timing: "before_user",
            role: "system",
            useStream: true,
            maxPerRun: 100,
            wrapperHead: "",
            wrapperTail: "",
            forceInsertAtEnd: false,
        },
        ui: {
            hideSummarized: true,
            keepVisibleCount: 6,
            useVectorBoundary: true,
        },
        textFilterRules: [...DEFAULT_FILTER_RULES],
        prompts: {
            memoryTemplate: DEFAULT_MEMORY_PROMPT_TEMPLATE,
        },
        vector: normalizeVectorConfig(),
    };
    return defaults;
}

function cloneConfig(value) {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

function assertSummaryConfigPersisted(expected, actual) {
    if (!actual || typeof actual !== "object") {
        throw new Error("保存后读取配置失败");
    }

    const expectedApi = expected?.api || {};
    const actualApi = actual?.api || {};
    const fields = ["provider", "url", "key", "model"];
    for (const field of fields) {
        if (String(actualApi[field] ?? "") !== String(expectedApi[field] ?? "")) {
            throw new Error(`保存校验失败：API ${field} 未写入服务器`);
        }
    }
}

function normalizeSummaryPanelConfig(rawConfig = null) {
    const defaults = createDefaultSummaryPanelConfig();
    const clampKeepVisibleCount = (value) => {
        const n = Number.parseInt(value, 10);
        if (!Number.isFinite(n)) return 6;
        return Math.max(0, Math.min(50, n));
    };

    if (!rawConfig || typeof rawConfig !== "object") {
        return defaults;
    }

    const textFilterRules = Array.isArray(rawConfig.textFilterRules)
        ? rawConfig.textFilterRules
        : (Array.isArray(rawConfig.vector?.textFilterRules)
            ? rawConfig.vector.textFilterRules
            : defaults.textFilterRules);

    const rawPrompts = rawConfig.prompts && typeof rawConfig.prompts === "object"
        ? rawConfig.prompts
        : {};

    const result = {
        api: { ...defaults.api, ...(rawConfig.api || {}) },
        gen: { ...defaults.gen, ...(rawConfig.gen || {}) },
        trigger: { ...defaults.trigger, ...(rawConfig.trigger || {}) },
        ui: { ...defaults.ui, ...(rawConfig.ui || {}) },
        textFilterRules,
        prompts: {
            memoryTemplate: String(rawPrompts.memoryTemplate || defaults.prompts.memoryTemplate || "").trim()
                || DEFAULT_MEMORY_PROMPT_TEMPLATE,
        },
        vector: normalizeVectorConfig(rawConfig.vector || null),
    };

    if (String(result.api.provider || "").toLowerCase() === "custom") {
        result.api.provider = "openai";
    }

    if (result.trigger.timing === "manual") {
        result.trigger.timing = defaults.trigger.timing;
        result.trigger.enabled = false;
    } else if (!VALID_TRIGGER_TIMINGS.has(result.trigger.timing)) {
        result.trigger.timing = defaults.trigger.timing;
    }
    if (result.trigger.useStream === undefined) result.trigger.useStream = true;
    result.ui.hideSummarized = !!result.ui.hideSummarized;
    result.ui.keepVisibleCount = clampKeepVisibleCount(result.ui.keepVisibleCount);
    result.ui.useVectorBoundary = result.ui.useVectorBoundary !== false;

    return result;
}

function writeConfigToLocalStorage(config) {
    localStorage.setItem(SUMMARY_CONFIG_LOCAL_STORAGE_KEY, JSON.stringify(config));
}

function setSummaryPanelConfigCache(config, { persistLocal = true } = {}) {
    const normalized = normalizeSummaryPanelConfig(config);
    summaryPanelConfigCache = normalized;
    if (persistLocal) {
        writeConfigToLocalStorage(normalized);
    }
    return normalized;
}

function ensureSummaryPanelConfigCache() {
    if (summaryPanelConfigCache) return summaryPanelConfigCache;

    try {
        const raw = localStorage.getItem(SUMMARY_CONFIG_LOCAL_STORAGE_KEY);
        if (!raw) {
            return setSummaryPanelConfigCache(createDefaultSummaryPanelConfig(), { persistLocal: false });
        }
        return setSummaryPanelConfigCache(JSON.parse(raw), { persistLocal: false });
    } catch {
        return setSummaryPanelConfigCache(createDefaultSummaryPanelConfig(), { persistLocal: false });
    }
}

export function getSummaryPanelConfig() {
    return cloneConfig(ensureSummaryPanelConfigCache());
}

export function saveSummaryPanelConfig(config) {
    try {
        const normalized = setSummaryPanelConfigCache(config);
        CommonSettingStorage.set(SUMMARY_CONFIG_KEY, normalized).catch((e) => {
            xbLog.error(MODULE_ID, "保存面板配置失败", e);
        });
        return normalized;
    } catch (e) {
        xbLog.error(MODULE_ID, "保存面板配置失败", e);
        return null;
    }
}

export function getVectorConfig() {
    const cfg = ensureSummaryPanelConfigCache();
    return cfg?.vector ? cloneConfig(cfg.vector) : normalizeVectorConfig();
}

export function getTextFilterRules() {
    const cfg = getSummaryPanelConfig();
    return Array.isArray(cfg?.textFilterRules)
        ? cfg.textFilterRules
        : DEFAULT_FILTER_RULES;
}

export function saveVectorConfig(vectorCfg) {
    try {
        const parsed = ensureSummaryPanelConfigCache();
        parsed.vector = normalizeVectorConfig(vectorCfg || null);
        setSummaryPanelConfigCache(parsed);
        CommonSettingStorage.set(SUMMARY_CONFIG_KEY, parsed).catch((e) => {
            xbLog.error(MODULE_ID, "保存向量配置失败", e);
        });
        return cloneConfig(parsed.vector);
    } catch (e) {
        xbLog.error(MODULE_ID, "保存向量配置失败", e);
        return null;
    }
}

export async function saveSummaryPanelConfigVerified(config) {
    const normalized = normalizeSummaryPanelConfig(config);
    await CommonSettingStorage.setAndSave(SUMMARY_CONFIG_KEY, normalized, { silent: false });
    CommonSettingStorage.clearCache();
    const savedConfig = await CommonSettingStorage.getStrict(SUMMARY_CONFIG_KEY, null);
    const savedNormalized = normalizeSummaryPanelConfig(savedConfig);
    assertSummaryConfigPersisted(normalized, savedNormalized);
    setSummaryPanelConfigCache(savedNormalized);
    return cloneConfig(savedNormalized);
}

export async function readSummaryPanelConfigFromServer() {
    try {
        const savedConfig = await CommonSettingStorage.get(SUMMARY_CONFIG_KEY, null);
        if (savedConfig) {
            return cloneConfig(normalizeSummaryPanelConfig(savedConfig));
        }
    } catch (e) {
        xbLog.warn(MODULE_ID, "加载面板配置失败", e);
    }
    return getSummaryPanelConfig();
}

export function applySummaryPanelConfigSnapshot(config) {
    return cloneConfig(setSummaryPanelConfigCache(config));
}

export async function loadConfigFromServer() {
    const loaded = await readSummaryPanelConfigFromServer();
    const applied = applySummaryPanelConfigSnapshot(loaded);
    xbLog.info(MODULE_ID, "已从服务端加载面板配置");
    return applied;
}
