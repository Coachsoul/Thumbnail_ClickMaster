
import React, { useState, useEffect } from 'react';
import { VideoInfo, ThumbnailResult, GenerationStatus, PsychologicalHook } from './types';
import { GeminiService } from './services/geminiService';

const LoadingOverlay: React.FC<{ status: GenerationStatus }> = ({ status }) => {
  const getMessage = () => {
    switch (status) {
      case GenerationStatus.ANALYZING: return "심리학적 전략 및 콘텐츠 생성 중...";
      case GenerationStatus.GENERATING_IMAGE: return "고해상도 썸네일 렌더링 중 (약 10-20초 소요)...";
      default: return "준비 중...";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-bold text-white mb-2">{getMessage()}</h2>
      <p className="text-slate-400 max-w-md">Gemini 3 Pro가 채널의 아이덴티티를 반영하여 최고의 결과물을 만들고 있습니다.</p>
    </div>
  );
};

const ApiKeyPrompt: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const handleOpenKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    onComplete();
  };

  return (
    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-lg mx-auto text-center mt-20">
      <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
      </div>
      <h2 className="text-2xl font-bold mb-4">Gemini 3 Pro 활성화 필요</h2>
      <p className="text-slate-400 mb-6">고퀄리티 썸네일 제작을 위해 <b>Gemini 3 Pro Image</b> 모델을 사용합니다.</p>
      <button onClick={handleOpenKey} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg">API 키 선택하기</button>
    </div>
  );
};

const App: React.FC = () => {
  const [videoInfo, setVideoInfo] = useState<VideoInfo>({ 
    title: '', 
    description: '', 
    category: 'Entertainment',
    language: 'ko',
    channelName: ''
  });
  const [refImage, setRefImage] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [result, setResult] = useState<ThumbnailResult | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [selectedHook, setSelectedHook] = useState<PsychologicalHook | null>(null);
  const [savedChannels, setSavedChannels] = useState<string[]>([]);

  useEffect(() => {
    // Load last used channel
    const savedChannelName = localStorage.getItem('cm_channel_name');
    if (savedChannelName) {
      setVideoInfo(prev => ({ ...prev, channelName: savedChannelName }));
    }

    // Load channel history
    const history = localStorage.getItem('cm_channel_history');
    if (history) {
      try {
        setSavedChannels(JSON.parse(history));
      } catch (e) {
        setSavedChannels([]);
      }
    }

    const checkKey = async () => {
      // @ts-ignore
      const ok = await window.aistudio.hasSelectedApiKey();
      setHasKey(ok);
    };
    checkKey();
  }, []);

  const updateChannelName = (name: string) => {
    setVideoInfo(prev => ({ ...prev, channelName: name }));
    localStorage.setItem('cm_channel_name', name);
  };

  const saveToHistory = (name: string) => {
    if (!name.trim()) return;
    const newHistory = [name, ...savedChannels.filter(c => c !== name)].slice(0, 10);
    setSavedChannels(newHistory);
    localStorage.setItem('cm_channel_history', JSON.stringify(newHistory));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRefImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다.');
  };

  const downloadImage = () => {
    if (!result?.imageUrl) return;
    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `${videoInfo.channelName}_thumbnail_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generate = async () => {
    if (!videoInfo.description || !videoInfo.channelName) {
      return alert("채널 이름과 영상 상세 내용을 입력해주세요.");
    }
    
    saveToHistory(videoInfo.channelName);

    try {
      setStatus(GenerationStatus.ANALYZING);
      const service = GeminiService.getInstance();
      const contentPackage = await service.analyzeVideoInfo(videoInfo);
      
      setStatus(GenerationStatus.GENERATING_IMAGE);
      const mainHook = contentPackage.hooks[1] || contentPackage.hooks[0]; 
      
      const imageUrl = await service.generateThumbnail(
        `High-impact thumbnail for ${videoInfo.channelName}. Context: ${videoInfo.description}. Hook: ${mainHook.copy}. Logic: ${mainHook.psychology}. Target Language: ${videoInfo.language}`,
        refImage || undefined,
        videoInfo.channelName
      );

      setResult({
        ...contentPackage,
        imageUrl,
        hashtags: "" 
      } as ThumbnailResult);
      setSelectedHook(mainHook);
      setStatus(GenerationStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      alert("생성 중 오류: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
            </div>
            <span className="font-bold text-xl hidden sm:inline">ClickMaster Studio</span>
          </div>
          {hasKey && (
            <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
              <div className="relative group max-w-[200px] sm:max-w-xs w-full">
                <input 
                  type="text" 
                  placeholder="채널 이름 입력 또는 선택"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                  value={videoInfo.channelName}
                  onChange={(e) => updateChannelName(e.target.value)}
                  list="channel-history"
                />
                <datalist id="channel-history">
                  {savedChannels.map(c => <option key={c} value={c} />)}
                </datalist>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!hasKey ? (
          <ApiKeyPrompt onComplete={() => setHasKey(true)} />
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-4 space-y-6">
              <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2">콘텐츠 기획</h2>
                  {savedChannels.length > 0 && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">최근 채널 선택 가능</span>
                  )}
                </div>

                <div className="space-y-5">
                  {/* Recent Channels Quick Select */}
                  {savedChannels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {savedChannels.slice(0, 3).map(name => (
                        <button 
                          key={name}
                          onClick={() => updateChannelName(name)}
                          className={`text-[10px] px-2 py-1 rounded-md border transition-all truncate max-w-[100px] ${videoInfo.channelName === name ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">타겟 언어</label>
                    <div className="flex gap-2">
                      {['ko', 'en'].map(l => (
                        <button key={l} onClick={() => setVideoInfo({...videoInfo, language: l as 'ko' | 'en'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${videoInfo.language === l ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{l === 'ko' ? 'KOREAN' : 'ENGLISH'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">영상 상세 내용 (제목은 AI가 생성)</label>
                    <textarea rows={6} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm" placeholder="영상 스크립트 요약을 입력하세요." value={videoInfo.description} onChange={(e) => setVideoInfo({...videoInfo, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">카테고리</label>
                      <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none" value={videoInfo.category} onChange={(e) => setVideoInfo({...videoInfo, category: e.target.value})}>
                        <option>Entertainment</option><option>Business</option><option>Tech</option><option>Lifestyle</option><option>Education</option><option>Gaming</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">참고 이미지</label>
                      <label className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
                        <span className="text-xs truncate">{refImage ? "✓ 업로드됨" : "파일 선택"}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                  <button onClick={generate} disabled={status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/10 transition-all">
                    {status === GenerationStatus.IDLE || status === GenerationStatus.SUCCESS || status === GenerationStatus.ERROR ? "콘텐츠 세트 생성" : "작업 중..."}
                  </button>
                </div>
              </section>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-8 space-y-6">
              {result ? (
                <div className="animate-in fade-in duration-500 space-y-6">
                  {/* Thumbnail and Titles */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl h-fit">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold">AI 생성 썸네일</h3>
                        <div className="flex gap-3">
                          <button onClick={downloadImage} className="text-emerald-400 text-xs hover:underline flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            다운로드
                          </button>
                          <button onClick={() => copyToClipboard(result.imageUrl)} className="text-indigo-400 text-xs hover:underline">데이터 복사</button>
                        </div>
                      </div>
                      <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-inner group relative">
                        <img src={result.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                          <span className="text-xs bg-black/60 px-2 py-1 rounded">고해상도 원본 (1K)</span>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {result.hooks.map((h, i) => (
                          <div key={i} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                            <div className="text-[9px] font-bold text-indigo-400 uppercase mb-1">{h.label}</div>
                            <div className="text-xs font-medium leading-tight line-clamp-2">{h.copy}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                      <h3 className="text-sm font-bold mb-4">AI 추천 영상 제목 (Top 5)</h3>
                      <div className="space-y-2">
                        {result.titles.map((t, i) => (
                          <div key={i} className="group flex items-center justify-between bg-slate-800 border border-slate-700 p-3 rounded-xl hover:border-indigo-500 transition-colors">
                            <span className="text-sm font-medium leading-snug pr-2">{t}</span>
                            <button onClick={() => copyToClipboard(t)} className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded transition-opacity">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Description & Keywords */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold">영상 상세 설명 (하단 #해시태그 포함)</h3>
                        <button onClick={() => copyToClipboard(result.fullDescription)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">설명 복사</button>
                      </div>
                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 h-[300px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-slate-400 font-sans leading-relaxed">{result.fullDescription}</pre>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold">고정 댓글 (Pinned Comment)</h3>
                        <button onClick={() => copyToClipboard(result.pinnedComment)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">댓글 복사</button>
                      </div>
                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 h-[300px] overflow-y-auto flex flex-col justify-center">
                        <p className="text-sm text-slate-300 italic text-center leading-relaxed">"{result.pinnedComment}"</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold">YouTube 태그용 키워드 (쉼표 구분)</h3>
                      <button onClick={() => copyToClipboard(result.keywords)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">키워드 복사</button>
                    </div>
                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                      <p className="text-sm text-indigo-200/70 italic break-words">{result.keywords}</p>
                    </div>
                  </div>

                  {/* Strategy Analysis */}
                  <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                      AI 마케팅 전략 리포트
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{result.analysis}</p>
                  </div>
                </div>
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center bg-slate-900/10 transition-all">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 text-slate-700 shadow-inner">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-500 mb-2">기획된 콘텐츠가 여기에 표시됩니다</h3>
                  <p className="text-slate-600 max-w-sm text-sm">영상의 핵심 정보를 입력하고 버튼을 눌러주세요. 제목부터 썸네일까지 올인원 세트를 제작해 드립니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {status !== GenerationStatus.IDLE && status !== GenerationStatus.SUCCESS && status !== GenerationStatus.ERROR && (
        <LoadingOverlay status={status} />
      )}
    </div>
  );
};

export default App;
