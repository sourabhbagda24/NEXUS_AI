# RAG evaluation

Measures the real retrieval pipeline (Neon + pgvector + Postgres full-text + RRF) and, optionally, the quality of the final answers.

## Steps

1. Start the server once so migrations and embeddings are done (`node --env-file=.env server.mjs`, wait for "Retrieval mode: full-text + pgvector"), then stop it.
2. Upload at least one real text PDF in the app (the 3 built-in samples are too short to test).
3. Generate a test set from your own documents:
   ```bash
   npm run eval:generate
   ```
   This writes `eval/dataset.json`. Open it, read the questions, and delete any that are vague or wrong.
4. Run the evaluation:
   ```bash
   npm run eval:run      # retrieval only, no LLM calls
   npm run eval:judge    # also generates answers and scores them with an LLM judge (15 questions)
   ```
   Results are printed and saved to `eval/results.json`.
5. Unit tests for the metric code: `npm run eval:test`.

## What the numbers mean

| Metric | Meaning |
| --- | --- |
| Hit@k | Share of questions where the source chunk is in the top k results |
| MRR | Average of 1 / rank of the source chunk (1.0 = always first) |
| nDCG@5 | Like Hit@5 but rewards a higher rank |
| Off-topic | Share of unrelated questions that correctly return no chunks |
| Faithfulness (1-5) | LLM judge: is every claim in the answer supported by the retrieved text |
| Correctness (1-5) | LLM judge: does the answer match the reference answer |

Strategies compared: `keyword` (Postgres full-text), `vector` (pgvector cosine), `hybrid` (both merged with RRF, k = 60).

## Limits to keep in mind

- Questions are written by an LLM from your own chunks, so they are easier than real user questions. Treat the scores as a relative comparison between strategies, not as production accuracy.
- Only the sampled chunk counts as correct. If a neighbouring chunk also answers the question, retrieval is marked as a miss, so scores are conservative.
- The LLM judge is a model grading a model. By default it is the same model that wrote the answer; set `EVAL_JUDGE_MODEL` in `.env` to use a different Groq model.
- Chunk ids change when a document is deleted and re-uploaded. Regenerate the dataset after that.
- Small datasets are noisy: with 30 questions, one question moves a score by about 3 points.
