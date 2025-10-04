# CBC Feedback Coach: A Feedback-Driven Writing Development Tool for Teachers

## TL;DR
*[To be updated as project progresses]*

## Model Details
*[To be updated as project progresses]*

## Usage
*[To be updated as project progresses]*

### Token Limitations and Optimal Usage
Based on the dataset analysis, Th Research observed that most of the grammar correction examples fell within 15-45 words, with some examples reaching 175 words. For optimal FLAN-T5 performance with the dataset:

- **Recommended max_output_length: 512 tokens** (full model capacity for comprehensive feedback)
- **Input handling: 512 tokens** (sufficient for most grammar correction inputs)
- **Frontend chunk optimization**: 
  - **targetWordsPerChunk: 300** (optimal for batch processing multiple corrections)
  - **minWordsPerChunk: 150** (handles shorter text inputs)
  - **maxWordsPerChunk: 400** (safe upper limit within 512-token constraint)
- **Word-to-token ratio**: Approximately 1.3-1.4 words per token for the English text
- **longer examples management**: The 175-word examples translate to ~230-250 tokens, well within the 512-token limit

## Uses
*[To be updated as project progresses]*

## Bias, Risks, and Limitations
*[To be updated as project progresses]*



**Bias considerations:**
- **Context fragmentation bias**: Due to the 512-token limit, the system splits longer texts into chunks for processing, which creates a significant bias where grammar corrections and feedback are generated based on isolated text segments rather than the complete contextual flow. This fragmentation may lead to corrections that ignore important contextual information from adjacent sentences or paragraphs, potentially resulting in suboptimal grammar corrections that don't account for the full narrative or argumentative structure of the original text

## Training Details
*[To be updated as project progresses]*

## Evaluation
*[To be updated as project progresses]*

## Environmental Impact
*[To be updated as project progresses]*
