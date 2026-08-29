'use client';

import { ChangeEvent, DragEvent, useRef, useState } from 'react';

type ScoreBreakdown = {
  formatting: number;
  keywords: number;
  experience: number;
  skills: number;
};

type AnalysisResult = {
  ats_score: number;
  score_breakdown: ScoreBreakdown;
  missing_keywords: string[];
  strengths: string[];
  improvements: string[];
  jd_match_percentage: number | null;
  jd_gap_analysis: string[];
  interview_questions: string[];
};

type LoadingStep = 'extracting' | 'analyzing' | null;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const scoreCopy = (score: number) => {
  if (score >= 85) return { label: 'Excellent foundation', tone: '#2c8054' };
  if (score >= 70) return { label: 'Strong, with room to sharpen', tone: '#d78b2c' };
  if (score >= 55) return { label: 'Promising, but needs focus', tone: '#c8782d' };
  return { label: 'Needs a strategic rewrite', tone: '#b95745' };
};

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body.detail === 'string' ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

function Logo() {
  return (
    <a className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]" href="#top" aria-label="ResumeIQ home">
      <span className="grid size-9 place-items-center rounded-xl bg-[#174c35] text-sm font-bold text-white shadow-[0_6px_18px_rgba(23,76,53,.22)]">RQ</span>
      <span className="text-lg">ResumeIQ</span>
    </a>
  );
}

function LoadingState({ step, fileName }: { step: LoadingStep; fileName: string }) {
  const extracting = step === 'extracting';
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center px-6 text-center" role="status" aria-live="polite">
      <div className="relative mb-8 size-24">
        <span className="absolute inset-0 rounded-full border border-[#d7e5da]" />
        <span className="loading-orbit absolute inset-0 rounded-full border-2 border-transparent border-t-[#28704d]" />
        <span className="absolute inset-4 grid place-items-center rounded-full bg-[#edf5ef] text-2xl text-[#1f6745]">{extracting ? '↥' : '✦'}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[.17em] text-[#789083]">{extracting ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-.045em] text-[#153c2b]">{extracting ? 'Reading your resume' : 'Finding the signal'}</h2>
      <p className="mt-3 max-w-sm leading-7 text-[#698074]">
        {extracting ? `Extracting the useful details from ${fileName}.` : 'Comparing your experience, skills, and language against strong ATS patterns.'}
      </p>
      <div className="mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#e4ece5]">
        <span className={`loading-bar block h-full rounded-full bg-[#2e7753] ${extracting ? 'w-2/5' : 'w-4/5'}`} />
      </div>
      <p className="mt-4 text-xs text-[#91a198]">Your resume is processed for this analysis and is not stored.</p>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const copy = scoreCopy(score);
  return (
    <div className="flex flex-col items-center">
      <div className="score-ring grid size-48 place-items-center rounded-full" style={{ background: `conic-gradient(${copy.tone} ${score * 3.6}deg, #e3ebe4 0deg)` }} aria-label={`ATS score ${score} out of 100`}>
        <div className="grid size-[158px] place-items-center rounded-full bg-[#fbfcfa] shadow-[inset_0_0_0_1px_rgba(33,78,54,.05)]">
          <div className="text-center">
            <strong className="block text-6xl font-semibold leading-none tracking-[-.07em] text-[#173e2c]">{score}</strong>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[.16em] text-[#82968a]">out of 100</span>
          </div>
        </div>
      </div>
      <p className="mt-5 text-sm font-semibold" style={{ color: copy.tone }}>{copy.label}</p>
    </div>
  );
}

function Breakdown({ scores }: { scores: ScoreBreakdown }) {
  const labels: Array<[keyof ScoreBreakdown, string]> = [
    ['formatting', 'Structure'],
    ['keywords', 'Keywords'],
    ['experience', 'Experience'],
    ['skills', 'Skills evidence'],
  ];
  return (
    <div className="space-y-5">
      {labels.map(([key, label]) => (
        <div key={key}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-[#385443]">{label}</span>
            <span className="font-semibold tabular-nums text-[#183e2c]">{scores[key]}<span className="font-normal text-[#92a198]"> / 25</span></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e5ece6]">
            <span className="block h-full rounded-full bg-[#2c7651] transition-[width] duration-700" style={{ width: `${scores[key] * 4}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Results({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#17251d]">
      <header className="sticky top-0 z-20 border-b border-[#dfe8e0]/90 bg-[#f6f8f4]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Logo />
          <button onClick={onReset} className="rounded-full border border-[#cad8cd] bg-white px-4 py-2 text-sm font-semibold text-[#28543b] transition hover:border-[#78a087] hover:bg-[#f3f8f3]">Analyze another</button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:px-10 lg:pt-14">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.17em] text-[#70877a]">Your resume analysis</p>
            <h1 className="mt-2 max-w-3xl text-balance text-4xl font-semibold tracking-[-.055em] text-[#153c2b] sm:text-5xl">A clearer path to your next interview.</h1>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#71867a]">Use this as a focused editing plan. Start with the highest-impact improvements, then recheck.</p>
        </div>

        <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]" aria-label="ATS score overview">
          <div className="rounded-[1.75rem] border border-white bg-[#fbfcfa] p-7 shadow-[0_18px_55px_rgba(31,68,46,.08)] sm:p-9">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#7f9287]">ATS readiness</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-.035em]">Overall score</h2>
              </div>
              <span className="rounded-full bg-[#edf5ef] px-3 py-1.5 text-xs font-semibold text-[#3f7657]">ResumeIQ score</span>
            </div>
            <ScoreRing score={result.ats_score} />
            {result.jd_match_percentage !== null && (
              <div className="mt-8 flex items-center justify-between rounded-2xl bg-[#173f2d] px-5 py-4 text-white">
                <span>
                  <span className="block text-xs text-[#b7d0c0]">Target role match</span>
                  <strong className="mt-0.5 block text-sm">Job description fit</strong>
                </span>
                <strong className="text-3xl tracking-[-.05em]">{result.jd_match_percentage}%</strong>
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-white bg-white p-7 shadow-[0_18px_55px_rgba(31,68,46,.06)] sm:p-9">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#7f9287]">How it adds up</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-.035em]">Score breakdown</h2>
            </div>
            <Breakdown scores={result.score_breakdown} />
            <p className="mt-8 rounded-2xl border border-[#e1e9e2] bg-[#f8faf7] px-4 py-3 text-xs leading-5 text-[#728479]">Each category contributes up to 25 points. The assessment uses your extracted text, so it does not judge visual details such as margins or font size.</p>
          </div>
        </section>

        {result.missing_keywords.length > 0 && (
          <section className="mt-5 rounded-[1.75rem] border border-[#f0dfc4] bg-[#fffaf0] p-7 sm:p-9">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#9b743b]">Opportunity</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-.035em] text-[#513b20]">Keywords worth considering</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#806b4d]">Add these only where they truthfully reflect your experience. Relevance beats keyword stuffing.</p>
              </div>
              <span className="w-fit rounded-full bg-[#f5e5c8] px-3 py-1.5 text-xs font-semibold text-[#8c6229]">{result.missing_keywords.length} gaps found</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {result.missing_keywords.map((keyword) => <span key={keyword} className="rounded-full border border-[#e8d4b3] bg-white px-3.5 py-2 text-sm font-medium text-[#624725]">+ {keyword}</span>)}
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-[#dce8de] bg-[#eef6ef] p-7 sm:p-9">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#d4e9d8] font-bold text-[#26704b]">✓</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#678373]">Keep these</p>
                <h2 className="text-xl font-semibold tracking-[-.035em] text-[#1f4b35]">What is working</h2>
              </div>
            </div>
            <ul className="space-y-3.5">
              {result.strengths.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-[#4d6c5a]"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#4a8b67]" />{item}</li>)}
            </ul>
          </article>

          <article className="rounded-[1.75rem] border border-[#e7e1d5] bg-white p-7 sm:p-9">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#fff0d6] font-bold text-[#a76c1f]">↗</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#927b59]">Next edits</p>
                <h2 className="text-xl font-semibold tracking-[-.035em] text-[#4b3a23]">Highest-impact improvements</h2>
              </div>
            </div>
            <ol className="space-y-4">
              {result.improvements.map((item, index) => <li key={item} className="flex gap-3 text-sm leading-6 text-[#655943]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f4ead8] text-xs font-semibold text-[#8d632c]">{index + 1}</span>{item}</li>)}
            </ol>
          </article>
        </section>

        {result.jd_gap_analysis.length > 0 && (
          <section className="mt-5 rounded-[1.75rem] bg-[#183f2e] p-7 text-white sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#a9c9b5]">Target role gap analysis</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">What the job asks for next</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {result.jd_gap_analysis.map((gap, index) => <div key={gap} className="flex gap-3 rounded-2xl bg-white/8 p-4 text-sm leading-6 text-[#d6e5db]"><span className="font-semibold text-[#f0b659]">0{index + 1}</span>{gap}</div>)}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-[1.75rem] border border-white bg-white p-7 shadow-[0_18px_55px_rgba(31,68,46,.06)] sm:p-9">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#7f9287]">Interview prep</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">Questions hiding in your resume</h2>
            </div>
            <span className="text-xs text-[#889a90]">Practice out loud for 60–90 seconds each</span>
          </div>
          <div className="divide-y divide-[#e8eee9]">
            {result.interview_questions.map((question, index) => (
              <details key={question} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 text-sm font-medium leading-6 text-[#304c3a]">
                  <span className="flex gap-4"><span className="font-mono text-xs text-[#91a399]">{String(index + 1).padStart(2, '0')}</span>{question}</span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eef4ef] text-lg text-[#4a735b] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mb-4 ml-9 rounded-xl bg-[#f7f9f6] px-4 py-3 text-sm leading-6 text-[#708177]">Build your answer with context, the decision you made, the measurable result, and what you learned.</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl border border-[#dbe5dc] bg-[#edf4ee] px-6 py-6 text-center sm:flex-row sm:text-left">
          <div><strong className="block text-[#244d37]">Ready for another pass?</strong><span className="mt-1 block text-sm text-[#6e8376]">Make your edits, export a fresh PDF, and see how the score changes.</span></div>
          <button onClick={onReset} className="shrink-0 rounded-xl bg-[#174c35] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(23,76,53,.18)] transition hover:-translate-y-0.5 hover:bg-[#103e2b]">Analyze another resume</button>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState<LoadingStep>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const selectFile = (selected: File | undefined) => {
    setError('');
    if (!selected) return;
    if (selected.type !== 'application/pdf' || !selected.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      setError('Please choose a PDF file. DOCX and image files are not supported yet.');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setError('That PDF is larger than 5 MB. Compress it or choose a smaller version.');
      return;
    }
    setFile(selected);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const analyze = async () => {
    if (!file || loading) return;
    setError('');
    setLoading('extracting');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadResponse.ok) throw new Error(await errorMessage(uploadResponse, 'The PDF could not be read.'));
      const upload = await uploadResponse.json();

      setLoading('analyzing');
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: upload.text, job_description: jobDescription.trim() || null }),
      });
      if (!analysisResponse.ok) throw new Error(await errorMessage(analysisResponse, 'The analysis could not be completed.'));
      setResult(await analysisResponse.json());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong. Please try again.';
      setError(message === 'Failed to fetch' ? 'ResumeIQ could not reach the analysis service. Check that the backend is running and try again.' : message);
    } finally {
      setLoading(null);
    }
  };

  const reset = () => {
    setFile(null);
    setJobDescription('');
    setError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (result) return <Results result={result} onReset={reset} />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8f4] text-[#17251d]">
      <div className="page-grid pointer-events-none absolute inset-0 opacity-45" />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Logo />
        <span className="rounded-full border border-[#d8e2d9] bg-white/70 px-3 py-1.5 text-xs font-medium text-[#527060] backdrop-blur">AI-powered resume review</span>
      </header>

      <section id="top" className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-7 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:px-10 lg:pb-24 lg:pt-14">
        <div className="max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d9e7dc] bg-[#eef5ef] px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#2f684c]">
            <span className="size-1.5 rounded-full bg-[#f0a63b]" /> Built for the next application
          </p>
          <h1 className="text-balance text-[clamp(3.3rem,7vw,6.5rem)] font-semibold leading-[.88] tracking-[-.075em] text-[#153c2b]">Make every word earn its place.</h1>
          <p className="mt-7 max-w-lg text-balance text-base leading-7 text-[#5a7164] sm:text-lg">Get a clear ATS score, find the keywords you missed, and turn your experience into a stronger interview story.</p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#476354]">
            {['Private by design', 'PDF up to 5 MB', 'Actionable results'].map((item) => (
              <span key={item} className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#dcebdd] text-[10px] font-bold text-[#236442]">✓</span>{item}</span>
            ))}
          </div>
          <div className="mt-10 hidden max-w-md grid-cols-3 gap-3 lg:grid">
            {[['01', 'Upload'], ['02', 'Compare'], ['03', 'Improve']].map(([number, label]) => (
              <div key={label} className="border-t border-[#cddbd0] pt-3"><span className="font-mono text-[10px] text-[#8ba095]">{number}</span><strong className="ml-2 text-xs text-[#506a5b]">{label}</strong></div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rotate-2 rounded-[2.5rem] bg-[#dfeadf]/65" />
          <div className="min-h-[590px] rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_28px_80px_rgba(36,68,49,.12)] sm:p-7">
            {loading ? <LoadingState step={loading} fileName={file?.name || 'your PDF'} /> : (
              <>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#7c9486]">New analysis</p><h2 className="mt-1.5 text-2xl font-semibold tracking-[-.035em]">Upload your resume</h2></div>
                  <span className="rounded-full bg-[#fff3df] px-3 py-1.5 text-xs font-semibold text-[#9a6420]">Free analysis</span>
                </div>

                <div
                  onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose a PDF resume"
                  className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-[1.4rem] border border-dashed px-6 text-center outline-none transition focus:ring-4 focus:ring-[#dceadf] ${dragging ? 'scale-[1.01] border-[#2e7753] bg-[#edf6ee]' : file ? 'border-[#7ba38a] bg-[#f2f7f1]' : 'border-[#a9beb0] bg-[#f7faf6] hover:border-[#367657] hover:bg-[#f2f7f1]'}`}
                >
                  <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={onFileChange} />
                  {file ? (
                    <>
                      <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-[#dcebdd] text-2xl text-[#236442]">✓</span>
                      <span className="max-w-full truncate font-semibold text-[#244c38]">{file.name}</span>
                      <span className="mt-1 text-sm text-[#769083]">{formatBytes(file.size)} · click to replace</span>
                    </>
                  ) : (
                    <>
                      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#174c35] text-2xl text-white shadow-[0_8px_22px_rgba(23,76,53,.2)]">↑</span>
                      <span className="font-semibold text-[#244c38]">Drop your PDF here</span>
                      <span className="mt-1 text-sm text-[#769083]">or click to browse · maximum 5 MB</span>
                    </>
                  )}
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 flex items-center justify-between text-sm font-medium text-[#34513f]">Target job description <span className="font-normal text-[#8ca095]">Optional</span></span>
                  <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} maxLength={30000} className="min-h-28 w-full resize-none rounded-2xl border border-[#dce5dd] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a1afa6] focus:border-[#4b8264] focus:ring-4 focus:ring-[#dceadf]" placeholder="Paste the role you’re applying for to see your match score…" />
                </label>

                {error && <div className="mt-4 flex gap-3 rounded-xl border border-[#f1cfc8] bg-[#fff4f1] px-4 py-3 text-sm leading-5 text-[#9a4b3c]" role="alert"><span aria-hidden="true">!</span><span>{error}</span></div>}

                <button disabled={!file} onClick={analyze} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#174c35] px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(23,76,53,.22)] transition hover:-translate-y-0.5 hover:bg-[#0f3f2b] disabled:cursor-not-allowed disabled:bg-[#a9b7ad] disabled:shadow-none disabled:hover:translate-y-0" type="button">Analyze my resume <span aria-hidden="true">→</span></button>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#e0e7e1] px-5 py-5 text-center text-xs text-[#819187]">ResumeIQ gives editorial guidance, not hiring guarantees. Always review suggestions before updating your resume.</footer>
    </main>
  );
}
