import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactQuill from "react-quill-new";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useStore } from "../store";
import { supabase } from "./supabase";
import { createAIClient } from '../utils/ai';
import {
  Notebook,
  Weight,
  Relevance,
  Trend,
  NotebookStatus,
  ScheduleItem,
  EditalDiscipline,
} from "../types";
import {
  calculateNextReview,
  DEFAULT_ALGO_CONFIG,
  calculateUrgencyScore,
  getAccuracyColorClass,
  getStatusColor,
} from "../utils/algorithm";
import { TheoryViewer } from "./TheoryViewer";
import { HeatmapCalendar } from "./HeatmapCalendar";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Square,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  CheckCircle2,
  LayoutGrid,
  Clock,
  AlertTriangle,
  Star,
  History,
  Sparkles,
  X,
  Save,
  Maximize2,
  Minimize2,
  Thermometer,
  Pencil,
  Link as LinkIcon,
  XCircle,
  ZoomIn,
  ChevronLeft,
  Calendar,
  Loader2,
  TrendingUp,
  Info,
  Scale,
  FileCode,
  Flag,
  List,
  Book,
  Brain,
  Target,
  BrainCircuit,
  AlertCircle,
  PlayCircle,
  Zap,
  Gauge,
  HelpCircle,
  Globe,
  Lock,
  Copy,
  FileText,
  Filter,
  Download,
  CalendarX,
  Send,
  CheckSquare,
} from "lucide-react";

// ORDEM LÓGICA CORRETA PARA EXIBIÇÃO
const ORDERED_ALGO_KEYS = ["learning", "reviewing", "mastering", "maintaining"];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "indent",
  "link",
  "image",
  "video",
  "color",
  "background",
];

export const Library: React.FC<{ isBankMode?: boolean }> = ({
  isBankMode = false,
}) => {
  const {
    notebooks,
    cycles,
    activeCycleId,
    config,
    updateConfig,
    addNotebook,
    editNotebook,
    deleteNotebook,
    pendingCreateData,
    setPendingCreateData,
    focusedNotebookId,
    setFocusedNotebookId,
    startSession,
    fetchNotebookImages,
    isGuest,
    user,
    updateNotebookSchedule,
    theories,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [editalFilter, setEditalFilter] = useState<string>(""); // NOVO ESTADO
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncingBulk, setIsSyncingBulk] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const isAdmin =
    user?.email === "danielfla82@gmail.com" ||
    user?.email === "dcsrj@hotmail.com";
  const [showFineTuning, setShowFineTuning] = useState(false);
  const [showDisciplineWeights, setShowDisciplineWeights] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);

  // DELETE MODAL STATE
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetStudentEmail, setTargetStudentEmail] = useState("");
  const [isSyncingField, setIsSyncingField] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [viewMode, setViewMode] = useState<"discipline" | "status">(
    "discipline",
  );

  const [theorySelectorOpen, setTheorySelectorOpen] = useState(false);
  const [viewingTheoryId, setViewingTheoryId] = useState<string | null>(null);
  const [isTheoryFullscreen, setIsTheoryFullscreen] = useState(false);
  const [theorySelectorTarget, setTheorySelectorTarget] = useState<{
    type: "main" | "subtopic";
    index?: number;
  } | null>(null);
  const [theorySearchTerm, setTheorySearchTerm] = useState("");

  // NOVO ESTADO EDITAL
  const [showEditalModal, setShowEditalModal] = useState(false);
  const [localEditalText, setLocalEditalText] = useState("");
  const [isProcessingEdital, setIsProcessingEdital] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());
  const hasInitializedExport = useRef(false);

  useEffect(() => {
    if (config.structuredEdital && !hasInitializedExport.current && notebooks.length > 0) {
      const initialSet = new Set<string>();
      const realNotebooksMap = new Map(notebooks.map(nb => [nb.discipline + "|" + nb.name, nb.id]));

      config.structuredEdital.forEach(d => {
        d.topics.forEach(t => {
           const key = d.name + "|" + t.name;
           if (realNotebooksMap.has(key)) {
               initialSet.add(realNotebooksMap.get(key)!);
           } else {
               initialSet.add(`ghost-${d.name}-${t.name}`);
           }
        });
      });
      setExportSelection(initialSet);
      hasInitializedExport.current = true;
    }
  }, [config.structuredEdital, notebooks]);
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const initialFormState = {
    edital: "",
    discipline: "",
    name: "",
    subtitle: "",
    tecLink: "",
    errorNotebookLink: "",
    errorNotebookComment: "",
    favoriteQuestionsLink: "",
    theoryId: "",
    extraErrorNotebooks: [] as { link: string; comment: string }[],
    extraSubtopics: [] as {
      subtitle: string;
      tecLink: string;
      accuracy?: number;
      theoryId?: string;
    }[],
    lawLink: "",
    lawLinkComment: "",
    obsidianLink: "",
    obsidianLinkComment: "",
    geminiLink1: "",
    geminiLink1Comment: "",
    geminiLink2: "",
    accuracy: 0,
    targetAccuracy: 90,
    weight: Weight.MEDIO,
    relevance: Relevance.MEDIA,
    trend: Trend.ESTAVEL,
    customScore: "" as string | number,
    status: NotebookStatus.NOT_STARTED,
    lastPractice: null as string | null,
    notes: "",
    images: [] as string[],
    accuracyHistory: [] as { date: string; accuracy: number }[],
    nextReview: "" as string | undefined | null,
    isGlobal: isBankMode,
    scheduledWeek: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [initialScheduledWeek, setInitialScheduledWeek] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- WEEK CALCULATION ---
  const weeksCount = useMemo(() => {
    if (config.startDate && config.examDate) {
      const start = new Date(config.startDate);
      const end = new Date(config.examDate);
      const diffWeeks = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7),
      );
      return Math.max(1, diffWeeks);
    }
    return config.weeksUntilExam || 12;
  }, [config.startDate, config.examDate, config.weeksUntilExam]);

  const weeksList = useMemo(
    () =>
      Array.from({ length: weeksCount }, (_, i) => ({
        id: `week-${i + 1}`,
        label: `Semana ${i + 1}`,
      })),
    [weeksCount],
  );

  const uniqueEditais = useMemo(
    () =>
      Array.from(
        new Set(notebooks.map((n) => n.edital).filter(Boolean)),
      ).sort(),
    [notebooks],
  );

  // --- SCORE CALCULATION ON EDIT ---
  const calculatedScore = useMemo(() => {
    return calculateUrgencyScore(
      formData.weight,
      formData.relevance,
      formData.trend,
    );
  }, [formData.weight, formData.relevance, formData.trend]);

  // --- ALGORITHM ACCELERATION LOGIC ---
  const currentReviewInterval =
    config.algorithm?.baseIntervals?.reviewing ||
    DEFAULT_ALGO_CONFIG.baseIntervals.reviewing;
  const defaultReviewInterval = DEFAULT_ALGO_CONFIG.baseIntervals.reviewing;
  const currentFactor = Math.round(
    currentReviewInterval / defaultReviewInterval,
  );

  const currentIntervals =
    config.algorithm?.baseIntervals || DEFAULT_ALGO_CONFIG.baseIntervals;

  const applyAcceleration = (factor: number) => {
    const base = DEFAULT_ALGO_CONFIG.baseIntervals;
    const newAlgoConfig = {
      ...config.algorithm,
      baseIntervals: {
        learning: Math.ceil(base.learning * factor),
        reviewing: Math.ceil(base.reviewing * factor),
        mastering: Math.ceil(base.mastering * factor),
        maintaining: Math.ceil(base.maintaining * factor),
      },
    };
    updateConfig({ ...config, algorithm: newAlgoConfig });
  };

  const INTERVAL_LABELS: Record<string, string> = {
    learning: "Aprendizado (Fase 1)",
    reviewing: "Revisão (Fase 2)",
    mastering: "Domínio (Fase 3)",
    maintaining: "Manutenção (Fase 4)",
  };

  const ALGO_TOOLTIPS: Record<string, { title: string; desc: string }> = {
    learning: {
      title: "Aprendizado (< 60%)",
      desc: "Fase de aquisição ou reconstrução. O sistema entende que você ainda não aprendeu. Intervalo curto para evitar perda.",
    },
    reviewing: {
      title: "Revisão (60% - 79%)",
      desc: "Fase de fixação. Você entende o assunto, mas comete erros ou tem lacunas. Intervalo médio-curto.",
    },
    mastering: {
      title: "Domínio (80% - 89%)",
      desc: "Fase de polimento. O conteúdo está sólido, quase excelente. Intervalo médio.",
    },
    maintaining: {
      title: "Manutenção (> 90%)",
      desc: "Você dominou o tópico. O objetivo é apenas combater a Curva do Esquecimento. Intervalo longo.",
    },
  };

  const SCORE_TOOLTIPS = {
    weight: {
      title: "Peso (45% do Score)",
      desc: "Impacto no Edital. Alto vale 45pts.",
    },
    relevance: {
      title: "Relevância (40% do Score)",
      desc: "Dificuldade pessoal ou tática. Alta vale 40pts.",
    },
    trend: {
      title: "Tendência (15% do Score)",
      desc: "Apostas da banca. Alta vale 15pts.",
    },
  };

  const isScheduledInActiveCycle = useCallback(
    (notebookId: string) => {
      const activeCycle = cycles.find((c) => c.id === activeCycleId);
      if (!activeCycle) return false;

      const nb = notebooks.find((n) => n.id === notebookId);
      if (nb?.weekId) return true;

      if (activeCycle.schedule) {
        return Object.values(activeCycle.schedule).some((slots) =>
          (slots as ScheduleItem[]).some(
            (slot) => slot.notebookId === notebookId,
          ),
        );
      }
      return false;
    },
    [cycles, activeCycleId, notebooks],
  );

  const handleEdit = useCallback(
    async (notebook: Notebook) => {
      if ((notebook as any).isGhost) {
        setEditingId(null);
        setFormData({
          ...initialFormState,
          discipline: notebook.discipline,
          name: notebook.name,
        });
        setInitialScheduledWeek("");
        setIsModalOpen(true);
        return;
      }
      
      setEditingId(notebook.id);
      let currentImages = notebook.images || [];

      if (currentImages.length === 0 && !isGuest && !notebook.isGlobal) {
        currentImages = await fetchNotebookImages(notebook.id);
      }

      if (currentImages.length === 0 && notebook.image)
        currentImages = [notebook.image];

      const isGlobalView = !!notebook.isGlobal;

      let currentWeek = "";
      if (activeCycleId) {
        const cycle = cycles.find((c) => c.id === activeCycleId);
        if (cycle?.schedule) {
          const foundEntry = Object.entries(cycle.schedule).find(
            ([wId, slots]) =>
              (slots as ScheduleItem[]).some(
                (s) => s.notebookId === notebook.id,
              ),
          );
          if (foundEntry) currentWeek = foundEntry[0];
        }
      }
      setInitialScheduledWeek(currentWeek);

      setFormData({
        edital: notebook.edital || "",
        discipline: notebook.discipline,
        name: notebook.name,
        subtitle: notebook.subtitle,

        tecLink: notebook.tecLink || "",
        errorNotebookLink: notebook.errorNotebookLink || "",
        errorNotebookComment: notebook.errorNotebookComment || "",
        favoriteQuestionsLink: notebook.favoriteQuestionsLink || "",
        extraErrorNotebooks: notebook.extraErrorNotebooks || [],
        extraSubtopics: notebook.extraSubtopics || [],
        lawLink: notebook.lawLink || "",
        lawLinkComment: notebook.lawLinkComment || "",
        obsidianLink: notebook.obsidianLink || "",
        obsidianLinkComment: notebook.obsidianLinkComment || "",
        geminiLink1: notebook.geminiLink1 || "",
        geminiLink1Comment: notebook.geminiLink1Comment || "",
        geminiLink2: notebook.geminiLink2 || "",
        theoryId: notebook.theoryId || "",

        accuracy: notebook.accuracy,
        status: notebook.status,
        accuracyHistory: notebook.accuracyHistory || [],
        lastPractice: notebook.lastPractice || null,
        nextReview: notebook.nextReview || "",
        notes: notebook.notes || "",
        images: currentImages,

        targetAccuracy: notebook.targetAccuracy,
        weight: notebook.weight,
        relevance: notebook.relevance,
        trend: notebook.trend,
        customScore: notebook.customScore || "",
        isGlobal: isGlobalView,
        scheduledWeek: currentWeek,
      });
      setIsModalOpen(true);
    },
    [fetchNotebookImages, isGuest, activeCycleId, cycles],
  );

  useEffect(() => {
    if (pendingCreateData) {
      setFormData({ ...initialFormState, ...pendingCreateData });
      setInitialScheduledWeek("");
      setEditingId(null);
      setIsModalOpen(true);
      setPendingCreateData(null);
    }
  }, [pendingCreateData]);

  useEffect(() => {
    if (focusedNotebookId) {
      const nb = notebooks.find((n) => n.id === focusedNotebookId);
      if (nb) {
        setSearchTerm(nb.name);
        const groupKey = viewMode === "discipline" ? nb.discipline : nb.status;
        setExpandedGroups((prev) => ({ ...prev, [groupKey]: true }));
        handleEdit(nb);
      }
      setFocusedNotebookId(null);
    }
  }, [focusedNotebookId, notebooks, viewMode, handleEdit]);

  const existingDisciplines = useMemo(
    () => Array.from(new Set(notebooks.map((n) => n.discipline))).sort(),
    [notebooks],
  );

  const computedNextReviewData = useMemo(() => {
    if (!isModalOpen) return null;

    if (
      formData.status === NotebookStatus.NOT_STARTED &&
      Number(formData.accuracy) === 0
    ) {
      return { isNotStarted: true };
    }

    const dateStr =
      formData.nextReview ||
      calculateNextReview(
        Number(formData.accuracy),
        formData.relevance,
        formData.trend,
        config.algorithm,
        Number(formData.targetAccuracy),
      ).toISOString();

    const nextDate = new Date(dateStr);
    let weekLabel = "";
    if (config.startDate) {
      const start = new Date(config.startDate);
      start.setHours(0, 0, 0, 0);
      const target = new Date(nextDate);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        const weekNum = Math.floor(diffDays / 7) + 1;
        weekLabel = `(Semana ${weekNum})`;
      } else {
        weekLabel = "(Passado)";
      }
    }
    return { date: nextDate, label: weekLabel, isNotStarted: false };
  }, [
    formData.accuracy,
    formData.relevance,
    formData.trend,
    formData.nextReview,
    config.algorithm,
    isModalOpen,
    config.startDate,
    formData.status,
    formData.targetAccuracy,
  ]);

  const stats = useMemo(() => {
    let validNotebooks = notebooks.filter(
      (n) => n.discipline !== "Revisão Geral",
    );
    if (isBankMode) {
      if (isAdmin) {
         const uniq = new Map<string, any>();
         for (const nb of validNotebooks) {
            const key = `${nb.discipline.toLowerCase()}|${nb.name.toLowerCase()}`;
            if (!uniq.has(key) || nb.isGlobal) {
               uniq.set(key, nb);
            }
         }
         validNotebooks = Array.from(uniq.values());
      } else {
         validNotebooks = validNotebooks.filter((nb) => nb.isGlobal);
      }
    } else {
      // Em modo Planejamento, para estatísticas, é melhor não contar cadernos não-iniciados (os globais intocados)
      // ou contar apenas os que não são globais puros. A decisão: vamos filtrar fora os globais aqui
      // para a média não ficar jogada no chão (0%).
      validNotebooks = validNotebooks.filter(
        (nb) => !nb.isGlobal || nb.status !== NotebookStatus.NOT_STARTED,
      );
    }
    const total = validNotebooks.length;
    const disciplines = new Set(validNotebooks.map((n) => n.discipline)).size;
    const mastered = validNotebooks.filter(
      (n) => (Number(n.accuracy) || 0) >= (Number(n.targetAccuracy) || 90),
    ).length;
    const globalAcc =
      total > 0
        ? Math.round(
            validNotebooks.reduce((acc, n) => acc + n.accuracy, 0) / total,
          )
        : 0;
    return { total, disciplines, mastered, globalAcc };
  }, [notebooks]);

  const groupedData = useMemo(() => {
    const filtered = notebooks.filter((nb) => {
      if (nb.discipline === "Revisão Geral") return false;

      if (isBankMode && !nb.isGlobal && !isAdmin) return false;
      // FILTRO EDITAL
      if (editalFilter && nb.edital !== editalFilter) return false;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        nb.name.toLowerCase().includes(searchLower) ||
        nb.discipline.toLowerCase().includes(searchLower) ||
        (nb.subtitle && nb.subtitle.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
      switch (activeFilter) {
        case "review":
          if (nb.status === NotebookStatus.REVIEWING) return true;
          if (nb.nextReview) {
            const today = new Date().toISOString().split("T")[0];
            return nb.nextReview.split("T")[0] <= today;
          }
          return false;
        case "critical":
          return (
            nb.accuracy < (Number(nb.targetAccuracy) || 90) * 0.75 &&
            nb.accuracy > 0
          );
        case "new":
          return nb.accuracy === 0;
        case "no_review":
          return !nb.nextReview && !isScheduledInActiveCycle(nb.id);
        case "neglected": {
          // Uma disciplina é negligenciada se NENHUM de seus cadernos está no ciclo ativo
          const disciplineNotebooks = notebooks.filter(
            (n) => n.discipline === nb.discipline,
          );
          return !disciplineNotebooks.some((n) =>
            isScheduledInActiveCycle(n.id),
          );
        }
        case "late":
          if (!nb.nextReview) return false;
          return (
            new Date(nb.nextReview).toISOString().split("T")[0] <
            new Date().toISOString().split("T")[0]
          );
        case "heavy":
          return nb.weight === Weight.ALTO;
        default:
          return true;
      }
    });

    const allFiltered = [...filtered] as (Notebook & { isGhost?: boolean; isEditalTarget?: boolean })[];
    
    // DEDUPLICAR SE FOR ADMIN EM MODO BANCO (Para não ver 10x o mesmo assunto se 10 usuários o tiverem)
    let finalFiltered = allFiltered;
    if (isBankMode && isAdmin) {
      const uniq = new Map<string, any>();
      for (const nb of allFiltered) {
        const key = `${nb.discipline.toLowerCase()}|${nb.name.toLowerCase()}`;
        // Prefira o global se existir, senão guarde o do usuário
        if (!uniq.has(key) || nb.isGlobal) {
          uniq.set(key, nb);
        }
      }
      finalFiltered = Array.from(uniq.values());
    }

    if (config?.draftEdital) {
      config.draftEdital.forEach(d => {
        d.topics.forEach(t => {
          const matchIndex = finalFiltered.findIndex(nb => nb.discipline === d.name && nb.name === t.name);
          if (matchIndex !== -1) {
            finalFiltered[matchIndex] = { ...finalFiltered[matchIndex], isEditalTarget: true };
          } else {
             const searchLower = searchTerm.toLowerCase();
             const matchesSearch = t.name.toLowerCase().includes(searchLower) || d.name.toLowerCase().includes(searchLower);
             if (matchesSearch) {
                 finalFiltered.push({
                   id: `ghost-${d.name}-${t.name}`,
                   name: t.name,
                   discipline: d.name,
                   isGhost: true,
                   isEditalTarget: true,
                   status: NotebookStatus.NOT_STARTED,
                   accuracy: 0,
                   targetAccuracy: 90,
                   questionsCompleted: 0,
                   weight: Weight.MEDIO,
                   relevance: Relevance.MEDIA,
                   trend: Trend.ESTAVEL,
                   customScore: 0,
                   isWeekCompleted: false,
                   notes: '',
                   images: [],
                   accuracyHistory: [],
                   isGlobal: isBankMode,
                   scheduledWeek: ''
                 } as any);
             }
          }
        });
      });
    }

    // Filtrar apenas o que está no Edital Verticalizado ou o que é Template Global Autorizado
    if (!isAdmin) {
       finalFiltered = finalFiltered.filter(nb => nb.isEditalTarget || nb.isGlobal);
    }

    const groups: Record<string, any[]> = {};
    finalFiltered.forEach((nb) => {
      let key = "";
      if (viewMode === "discipline") {
        key = nb.discipline;
      } else {
        const target = Number(nb.targetAccuracy) || 90;
        const accuracy = Number(nb.accuracy) || 0;
        if (accuracy >= target) key = "Concluídos (Meta Batida)";
        else if (accuracy > 0) key = "Em Andamento";
        else key = "Não Iniciados";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(nb);
    });

    const sortedKeys = Object.keys(groups).sort();
    if (viewMode === "status") {
      const priority = [
        "Em Andamento",
        "Não Iniciados",
        "Concluídos (Meta Batida)",
      ];
      sortedKeys.sort((a, b) => {
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
    }
    sortedKeys.forEach((key) => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });
    return { groups, sortedKeys };
  }, [
    notebooks,
    searchTerm,
    activeFilter,
    viewMode,
    editalFilter,
    isScheduledInActiveCycle,
  ]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setInitialScheduledWeek("");
    setIsModalOpen(true);
  };

  const requestDelete = (nb: { id: string; name: string }) => {
    setNotebookToDelete(nb);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (notebookToDelete) {
      try {
        await deleteNotebook(notebookToDelete.id);
        setDeleteModalOpen(false);
        setNotebookToDelete(null);
      } catch (error) {
        console.error("Delete error:", error);
        alert("Erro ao excluir.");
      }
    }
  };

  const handleChange = (field: keyof typeof initialFormState, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleUpdateAlgoInterval = (key: string, value: number) => {
    const currentAlgo = config.algorithm || DEFAULT_ALGO_CONFIG;
    const newAlgo = {
      ...currentAlgo,
      baseIntervals: { ...currentAlgo.baseIntervals, [key]: value },
    };
    updateConfig({ ...config, algorithm: newAlgo });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach((file) => {
        if (file.size > 30 * 1024 * 1024) {
          alert("Imagem muito grande (>30MB).");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result)
            setFormData((prev) => ({
              ...prev,
              images: [...prev.images, reader.result as string],
            }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData("text/plain");
    if (!dragIndexStr) return;

    const dragIndex = parseInt(dragIndexStr, 10);
    if (dragIndex === dropIndex || isNaN(dragIndex)) return;

    const newImages = [...formData.images];
    const [draggedImage] = newImages.splice(dragIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return await res.blob();
  };

  const uploadImageToStorage = async (
    base64: string,
    prefix: string,
  ): Promise<string> => {
    try {
      const blob = await base64ToBlob(base64);
      const fileExt = base64.substring(
        "data:image/".length,
        base64.indexOf(";base64"),
      );
      const fileName = `uploads/${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("notebook-images")
        .upload(fileName, blob, { contentType: blob.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("notebook-images")
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch (e) {
      console.error(
        "Auto-upload failed for one image, keeping base64 fallback",
        e,
      );
      return base64;
    }
  };

  const handleSyncField = async (
    field:
      | "general_info"
      | "tec_links"
      | "error_links"
      | "subtopics"
      | "summary_and_images"
      | "weights"
      | "favorite_questions"
      | "external_links"
      | "observations",
  ) => {
    if (!user) return;
    setIsSyncingField(field);
    setSyncMessage(null);

    let payload: any = {};
    if (field === "general_info") {
      payload = { edital: formData.edital, subtitle: formData.subtitle };
    } else if (field === "tec_links") {
      payload = {
        tec_link: formData.tecLink,
        tec_link_comment: formData.tecLinkComment,
        extra_tec_notebooks: formData.extraTecNotebooks || [],
      };
    } else if (field === "error_links") {
      payload = {
        error_notebook_link: formData.errorNotebookLink,
        error_notebook_comment: formData.errorNotebookComment,
        extra_error_notebooks: formData.extraErrorNotebooks || [],
      };
    } else if (field === "subtopics") {
      payload = {
        extra_subtopics: formData.extraSubtopics || [],
      };
    } else if (field === "summary_and_images") {
      payload = { notes: formData.notes, images: formData.images };
    } else if (field === "weights") {
      payload = {
        weight: formData.weight,
        relevance: formData.relevance,
        trend: formData.trend,
        custom_score: formData.customScore,
      };
    } else if (field === "favorite_questions") {
      payload = { favorite_questions_link: formData.favoriteQuestionsLink };
    } else if (field === "external_links") {
      payload = {
        law_link: formData.lawLink,
        law_link_comment: formData.lawLinkComment,
        obsidian_link: formData.obsidianLink,
        obsidian_link_comment: formData.obsidianLinkComment,
        gemini_link1: formData.geminiLink1,
        gemini_link1_comment: formData.geminiLink1Comment,
        gemini_link2: formData.geminiLink2,
      };
    } else if (field === "observations") {
      payload = { subtitle: formData.subtitle };
    }

    try {
      const { data, error } = await supabase.rpc(
        "admin_push_notebook_field_v2",
        {
          p_admin_email: user.email,
          p_discipline: formData.discipline,
          p_name: formData.name,
          p_field: field,
          p_json_value: payload,
          p_target_email: targetStudentEmail.trim() || null,
        },
      );

      if (error) throw error;
      if (data?.success) {
        setSyncMessage({
          text: `Sincronizado! ${data.updated} registro(s) alterados.`,
          type: "success",
        });
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage({ text: `Erro: ${data?.error}`, type: "error" });
      }
    } catch (e: any) {
      setSyncMessage({ text: `Erro: ${e.message}`, type: "error" });
    } finally {
      setIsSyncingField(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let nextDateStr: string | null | undefined = formData.nextReview;

      if (
        formData.status === NotebookStatus.NOT_STARTED &&
        Number(formData.accuracy) === 0
      ) {
        nextDateStr = null;
      } else if (!nextDateStr) {
        const nextDate = calculateNextReview(
          Number(formData.accuracy),
          formData.relevance,
          formData.trend,
          config.algorithm,
          Number(formData.targetAccuracy),
        );
        nextDateStr = nextDate.toISOString();
      }

      let processedImages = [...formData.images];
      if (!isGuest) {
        const uploadedImages: string[] = [];
        for (const img of processedImages) {
          if (img.startsWith("data:image")) {
            const url = await uploadImageToStorage(img, editingId || "new");
            uploadedImages.push(url);
          } else {
            uploadedImages.push(img);
          }
        }
        processedImages = uploadedImages;
      }

      const payload: any = {
        ...formData,
        images: processedImages,
        accuracy: Number(formData.accuracy),
        targetAccuracy: Number(formData.targetAccuracy),
        customScore: formData.customScore ? Number(formData.customScore) : null,
        nextReview: nextDateStr,
      };

      if (!isAdmin) {
        payload.isGlobal = false;
      }

      let targetNbId = editingId;
      if (editingId) {
        await editNotebook(editingId, payload);
      } else {
        targetNbId = await addNotebook(payload);
      }

      if (
        activeCycleId &&
        targetNbId &&
        formData.scheduledWeek !== initialScheduledWeek
      ) {
        await updateNotebookSchedule(targetNbId, formData.scheduledWeek);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const navigateLightbox = (direction: "next" | "prev") => {
    if (lightboxIndex === null) return;
    if (direction === "next")
      setLightboxIndex((lightboxIndex + 1) % formData.images.length);
    else
      setLightboxIndex(
        (lightboxIndex - 1 + formData.images.length) % formData.images.length,
      );
  };

  const handleConcludeReview = async () => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const newAccuracy = Number(formData.accuracy);
      const nextDate = calculateNextReview(
        newAccuracy,
        formData.relevance,
        formData.trend,
        config.algorithm,
        Number(formData.targetAccuracy),
      );

      const newHistory = [
        ...(formData.accuracyHistory || []),
        { date: now, accuracy: newAccuracy },
      ].slice(-365);

      let newStatus = formData.status;
      if (formData.status === NotebookStatus.NOT_STARTED && newAccuracy > 0) {
        newStatus = NotebookStatus.REVIEWING;
      }

      const lastPractice = now;

      if (editingId) {
        await editNotebook(editingId, {
          accuracy: newAccuracy,
          accuracyHistory: newHistory,
          lastPractice,
          nextReview: nextDate.toISOString(),
          status: newStatus,
        });
        setFormData((prev) => ({
          ...prev,
          accuracy: newAccuracy,
          accuracyHistory: newHistory,
          lastPractice,
          nextReview: nextDate.toISOString(),
          status: newStatus,
        }));
      }
    } catch (err) {
      console.error("Quick save failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const removeHistoryItem = (index: number) => {
    const newHistory = [...(formData.accuracyHistory || [])];
    newHistory.splice(index, 1);
    setFormData((prev) => ({ ...prev, accuracyHistory: newHistory }));
  };

  const handleExportNotebooks = () => {
    let exportList = notebooks;
    if (isBankMode) {
      if (isAdmin) {
         const uniq = new Map<string, any>();
         for (const nb of notebooks) {
            const key = `${nb.discipline.toLowerCase()}|${nb.name.toLowerCase()}`;
            if (!uniq.has(key) || nb.isGlobal) {
               uniq.set(key, nb);
            }
         }
         exportList = Array.from(uniq.values());
      } else {
         exportList = notebooks.filter((n) => n.isGlobal);
      }
    }
    const backupData = {
      type: "atena_notebooks_export",
      version: "10.0.0",
      date: new Date().toISOString(),
      count: exportList.length,
      data: exportList,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atena_cadernos_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processEditalText = async () => {
    if (!localEditalText.trim()) return;
    setIsProcessingEdital(true);
    const ai = createAIClient();
    try {
      const existingTopics = notebooks.map(nb => `${nb.discipline} > ${nb.name}`).join('\n');
      const prompt = `
        Você é um especialista em concursos públicos.
        Analise o seguinte texto de edital e estruture-o de forma verticalizada.
        
        Compare cuidadosamente o conteúdo programático do edital com os tópicos que já existem no meu banco de dados listados abaixo:
        --- Banco de Assuntos Atual ---
        ${existingTopics}
        -------------------------------

        INSTRUÇÕES IMPORTANTES:
        1. Ao estruturar as disciplinas e tópicos, você deve realizar uma análise *semântica e contextual* aprofundada dos assuntos.
        2. NÃO USE APENAS CORRESPONDÊNCIA DE TÍTULOS. Se o assunto pedido no edital for conceitualmente coberto, equivalente ou similar a um tópico que JÁ EXISTE no 'Banco de Assuntos Atual', você é **OBRIGADO** a retornar EXATAMENTE o mesmo nome de disciplina e tópico que estão no Banco. 
        Exemplo: Se o edital pede "Organização administrativa" ou "Agentes Públicos", e no Banco existe "Atos e Agentes Públicos", use "Atos e Agentes Públicos". 
        3. Só invente um nome de disciplina/tópico novo se realmente não houver nada no banco de dados que corresponda ou englobe aquele assunto.
        
        TEXTO DO EDITAL A SER ANALISADO:
        ${localEditalText.substring(0, 30000)} 
        
        Para cada tópico estruturado, defina o peso (probability) apenas como: "Baixa", "Média" ou "Alta".
        
        Retorne APENAS JSON válido, como neste formato:
        { "disciplines": [ { "name": "Nome da Disciplina", "topics": [ { "name": "Nome do Tópico", "probability": "Alta" | "Média" | "Baixa" } ] } ] }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        const structured: EditalDiscipline[] = result.disciplines.map((d: any) => ({
          name: d.name,
          topics: d.topics.map((t: any) => ({
            name: t.name,
            probability: t.probability || 'Média', 
            checked: false
          }))
        }));
        
        await updateConfig({ ...config, draftEdital: structured, draftEditalText: localEditalText });
        
        // Auto start selection mode with AI results
        const initialSet = new Set<string>();
        const allFiltered = [...filtered] as (Notebook & { isGhost?: boolean; isEditalTarget?: boolean })[];
        structured.forEach(d => {
          d.topics.forEach(t => {
            const match = allFiltered.find(nb => nb.discipline === d.name && nb.name === t.name);
            if (match) {
              initialSet.add(match.id);
            } else {
              initialSet.add(`ghost-${d.name}-${t.name}`);
            }
          });
        });
        setExportSelection(initialSet);
        
        setLocalEditalText("");
        setShowEditalModal(false);
      }
    } catch (error) {
      console.error("Erro ao processar edital:", error);
      alert("Houve um erro ao processar o edital. Verifique o console.");
    } finally {
      setIsProcessingEdital(false);
    }
  };

  const toggleExportSelection = (id: string) => {
    setExportSelection((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const confirmSelectionExport = async () => {
    if (exportSelection.size === 0) {
      alert("Nenhum assunto selecionado para exportar.");
      return;
    }

    // Recover notebooks matching the IDs in exportSelection, including "ghosts"
    // Since ghosts don't exist in the real 'notebooks' array, we parse their IDs or just rebuild them from draftEdital + real notebooks.
    
    // Create a map to group topics by discipline
    const structuredMap = new Map<string, { discName: string, topics: { name: string, probability: 'Alta'|'Média'|'Baixa'|'N/A' }[] }>();

    // First, process real notebooks
    const realNotebooksMap = new Map(notebooks.map(nb => [nb.id, nb]));
    
    // Let's also look at draftEdital to optionally get probability values if available
    const probabilityMap = new Map<string, string>();
    if (config.draftEdital) {
       config.draftEdital.forEach(d => {
          d.topics.forEach(t => {
             probabilityMap.set(`${d.name}|${t.name}`, t.probability || 'Média');
          });
       });
    }

    // Iterate through everything the user selected
    exportSelection.forEach(id => {
       let discName = "";
       let topicName = "";
       let probability: 'Alta'|'Média'|'Baixa'|'N/A' = 'Média';
       
       if (id.startsWith('ghost-')) {
          // ID format is ghost-${d.name}-${t.name}
          const parts = id.replace('ghost-', '').split('-');
          discName = parts[0];
          topicName = parts.slice(1).join('-');
       } else {
          const nb = realNotebooksMap.get(id);
          if (nb) {
             discName = nb.discipline;
             topicName = nb.name;
          } else {
             // Invalid ID
             return;
          }
       }

       // Try to load probability from standard mapping
       const probKey = `${discName}|${topicName}`;
       if (probabilityMap.has(probKey)) {
          probability = probabilityMap.get(probKey) as any;
       }

       if (!structuredMap.has(discName)) {
           structuredMap.set(discName, { discName, topics: [] });
       }
       
       // Preserve existing checked state if the user previously exported and checked this topic
       let existingChecked = false;
       if (config.structuredEdital) {
         const existingDisc = config.structuredEdital.find(d => d.name === discName);
         if (existingDisc) {
           const existingTopic = existingDisc.topics.find(t => t.name === topicName);
           if (existingTopic) {
             existingChecked = !!existingTopic.checked;
           }
         }
       }

       structuredMap.get(discName)!.topics.push({ name: topicName, probability, checked: existingChecked });
    });

    const finalStructuredEdital = Array.from(structuredMap.values()).map(d => ({
        name: d.discName,
        topics: d.topics
    }));
    
    await updateConfig({ 
      ...config, 
      structuredEdital: finalStructuredEdital, 
      editalText: config.draftEditalText || config.editalText || '' 
    });
    
    alert("Assuntos selecionados exportados com sucesso para a aba Edital Verticalizado!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 relative h-full flex flex-col">
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-sm">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-slate-900 dark:text-white hover:text-green-500 z-50"
          >
            <X size={32} />
          </button>
          {formData.images.length > 1 && (
            <>
              <button
                onClick={() => navigateLightbox("prev")}
                className="absolute left-4 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-full hover:bg-green-600 text-white z-50"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={() => navigateLightbox("next")}
                className="absolute right-4 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-full hover:bg-green-600 text-white z-50"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={5}
            centerOnInit={true}
          >
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full flex items-center justify-center"
            >
              <img
                src={formData.images[lightboxIndex]}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
                alt="Mapa Mental"
              />
            </TransformComponent>
          </TransformWrapper>
          <div className="absolute bottom-4 bg-black/50 px-4 py-1 rounded-full text-slate-900 dark:text-white text-sm z-50">
            {lightboxIndex + 1} / {formData.images.length}
          </div>
        </div>
      )}

      {deleteModalOpen && notebookToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-red-500/10 rounded-full text-red-500">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Excluir Caderno?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tem certeza que deseja apagar{" "}
                  <strong>"{notebookToDelete.name}"</strong>? Esta ação não pode
                  ser desfeita.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 dark:border-slate-800 pb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <LayoutGrid
              className={isBankMode ? "text-indigo-500" : "text-green-500"}
            />
            {isBankMode
              ? "Banco de Assuntos (Templates Globais)"
              : "Banco de Assuntos"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isBankMode
              ? "Gerencie os templates de cadernos limpos disponíveis globalmente."
              : "Gerencie seus cadernos e acompanhe o progresso por tópico."}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
          {/* NOVO FILTRO: EDITAL */}
          <div className="relative w-full md:w-48">
            <select
              value={editalFilter}
              onChange={(e) => setEditalFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-sm text-slate-900 dark:text-white focus:border-green-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:bg-slate-800"
            >
              <option value="">Todos Editais</option>
              {uniqueEditais.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500">
              <ChevronDown size={16} />
            </div>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-2.5 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar tópicos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white focus:border-green-500 outline-none"
            />
          </div>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setViewMode("discipline")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === "discipline" ? "bg-slate-700 text-slate-900 dark:text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"}`}
            >
              Por Disciplina
            </button>
            <button
              onClick={() => setViewMode("status")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === "status" ? "bg-green-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-white"}`}
            >
              Por Status
            </button>
          </div>

          {isAdmin && (
            <div className="flex flex-col items-center gap-1 relative">
              <button
                onClick={async () => {
                  if (isSyncingBulk) return;
                  setIsSyncingBulk(true);
                  setSyncResult(null);
                  try {
                    const { data: globals } = await supabase
                      .from("notebooks")
                      .select("discipline, name")
                      .is("user_id", null);
                    const userNotebooks = notebooks.filter((n) => !n.isGlobal);
                    let count = 0;
                    for (const nb of userNotebooks) {
                      const exists = globals?.find(
                        (g) =>
                          g.name === nb.name && g.discipline === nb.discipline,
                      );
                      if (!exists) {
                        const payload = {
                          edital: nb.edital,
                          discipline: nb.discipline,
                          name: nb.name,
                          subtitle: nb.subtitle,
                          accuracy: 0,
                          target_accuracy: nb.targetAccuracy,
                          weight: nb.weight,
                          relevance: nb.relevance,
                          trend: nb.trend,
                          status:
                            typeof nb.status === "string"
                              ? nb.status
                              : NotebookStatus.NOT_STARTED,
                          user_id: null,
                        };
                        await supabase.from("notebooks").insert(payload);
                        count++;
                      }
                    }
                    setSyncResult(`${count} tópicos!`);
                  } catch (e) {
                    console.error(e);
                    setSyncResult("Erro");
                  }
                  setIsSyncingBulk(false);
                  setTimeout(() => setSyncResult(null), 3000);
                }}
                disabled={isSyncingBulk}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                title="Publicar todos os tópicos"
              >
                {isSyncingBulk ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Globe size={18} />
                )}
                <span className="hidden md:inline">
                  {isSyncingBulk ? "Sincronizando..." : "Sync Templates"}
                </span>
              </button>
              {syncResult && (
                <span className="absolute -bottom-6 text-xs font-bold text-indigo-400 whitespace-nowrap">
                  {syncResult}
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleExportNotebooks}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white rounded-lg font-bold text-sm transition-colors border border-slate-300 dark:border-slate-700 shadow-sm"
            title="Baixar Backup dos Cadernos"
          >
            <Download size={18} />{" "}
            <span className="hidden md:inline">Backup</span>
          </button>

          <button
            onClick={() => setShowEditalModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-900/20 whitespace-nowrap justify-center"
            title="Analisar Edital (IA)"
          >
            <Sparkles size={18} /> Analisar Edital
          </button>
          
          <button
            onClick={confirmSelectionExport}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-purple-900/20 whitespace-nowrap justify-center"
          >
            <Target size={18} /> Exportar Edital {exportSelection.size > 0 ? `(${exportSelection.size})` : ''}
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-green-900/20 whitespace-nowrap justify-center"
          >
            <Plus size={18} /> Novo Caderno
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              Cadernos
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {stats.total}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              Disciplinas
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {stats.disciplines}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-green-900/20 rounded-lg text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              Dominados
            </p>
            <p className="text-xl font-bold text-green-400">{stats.mastered}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-indigo-900/20 rounded-lg text-indigo-500">
            <Thermometer size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              Acurácia Global
            </p>
            <p className="text-xl font-bold text-indigo-400">
              {stats.globalAcc}%
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 custom-scrollbar">
        {[
          { id: "all", label: "Todos" },
          { id: "review", label: "Em Revisão", icon: Clock },
          { id: "no_review", label: "Sem Revisão", icon: CalendarX },
          {
            id: "neglected",
            label: "Disciplinas Negligenciadas",
            icon: AlertCircle,
          },
          { id: "critical", label: "Críticos (<60%)", icon: AlertTriangle },
          { id: "new", label: "Novos", icon: Sparkles },
          { id: "late", label: "Atrasados", icon: History },
          { id: "heavy", label: "Peso Alto", icon: Star },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-all ${activeFilter === f.id ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-600" : "bg-transparent text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700"}`}
          >
            {f.icon && <f.icon size={16} />} {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {groupedData.sortedKeys.map((groupKey) => {
          const items = groupedData.groups[groupKey];
          const isExpanded = expandedGroups[groupKey];
          const avgAcc = Math.round(
            items.reduce((acc, i) => acc + i.accuracy, 0) / items.length,
          );
          const avgTarget = Math.round(
            items.reduce(
              (acc, i) => acc + (Number(i.targetAccuracy) || 90),
              0,
            ) / items.length,
          );

          return (
            <div
              key={groupKey}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all"
            >
              <div
                onClick={() => toggleGroup(groupKey)}
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${viewMode === "status" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"} ${viewMode === "status" && groupKey.includes("Concluídos") ? "bg-green-500" : viewMode === "status" && groupKey.includes("Andamento") ? "bg-blue-500" : viewMode === "status" ? "bg-slate-700" : "bg-slate-100 dark:bg-slate-800"}`}
                  >
                    {isExpanded ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                      {groupKey}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {items.length} tópicos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={`px-2 py-1 rounded text-xs font-bold border ${avgAcc >= avgTarget ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" : avgAcc < avgTarget * 0.75 ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30" : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30"}`}
                  >
                    Avg: {avgAcc}%
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-800/50">
                  {items.map((nb) => {
                    const isScheduled = isScheduledInActiveCycle(nb.id);
                    const displayScore =
                      nb.customScore !== null && nb.customScore !== undefined
                        ? nb.customScore
                        : calculateUrgencyScore(
                            nb.weight,
                            nb.relevance,
                            nb.trend,
                          );

                    return (
                      <div
                        key={nb.id}
                        className="flex items-center justify-between group hover:bg-slate-100 dark:bg-slate-800/20"
                      >
                        <div className="pl-4 py-4 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={exportSelection.has(nb.id)}
                            onChange={() => toggleExportSelection(nb.id)}
                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </div>
                        <div
                          className="flex-1 min-w-0 p-4 cursor-pointer"
                          onClick={() => handleEdit(nb)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">
                              {nb.name}
                            </h4>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-1.5 rounded uppercase font-bold">
                              Score: {displayScore}
                            </span>
                            {nb.isGlobal && (
                              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/20 px-1.5 rounded uppercase font-bold flex items-center gap-1">
                                <Globe size={12} /> Global
                              </span>
                            )}
                            {(nb as any).isEditalTarget && (
                              <span className="text-[9px] bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/20 px-1.5 rounded uppercase font-bold flex items-center gap-1">
                                <Target size={12} /> Alvo Edital
                              </span>
                            )}
                            {(nb as any).isGhost && (
                              <span className="text-[9px] bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/20 px-1.5 rounded uppercase font-bold flex items-center gap-1">
                                <AlertTriangle size={12} /> Criar Manualmente
                              </span>
                            )}
                            {nb.weight === Weight.ALTO && (
                              <span className="text-[9px] bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/20 px-1.5 rounded uppercase font-bold">
                                Peso Max
                              </span>
                            )}
                            {viewMode === "status" && (
                              <span className="text-[9px] text-slate-500 border border-slate-300 dark:border-slate-700 px-1.5 rounded uppercase font-bold">
                                {nb.discipline}
                              </span>
                            )}
                            {isScheduled && (
                              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/20 px-1.5 rounded uppercase font-bold flex items-center gap-1">
                                <span className="w-1 h-1 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-pulse"></span>{" "}
                                No Ciclo
                              </span>
                            )}
                            {nb.extraSubtopics &&
                              nb.extraSubtopics.length > 0 && (
                                <span className="text-[9px] bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-500/20 px-1.5 rounded uppercase font-bold flex items-center gap-1">
                                  +{nb.extraSubtopics.length} Maiores Cobranças
                                </span>
                              )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {nb.subtitle}
                          </p>

                          <div className="flex md:hidden gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                            <span>
                              Acc:{" "}
                              <strong
                                className={getAccuracyColorClass(
                                  Number(nb.accuracy),
                                  Number(nb.targetAccuracy),
                                  nb.status,
                                )}
                              >
                                {nb.accuracy}%
                              </strong>
                            </span>
                            <span>
                              Rev:{" "}
                              {nb.nextReview
                                ? nb.nextReview
                                    .split("T")[0]
                                    .split("-")
                                    .reverse()
                                    .join("/")
                                : "--"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 md:gap-8 px-4 py-2 border-l border-slate-200 dark:border-slate-800/30">
                          <div className="text-right hidden md:block">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">
                              Acurácia
                            </p>
                            <p
                              className={`font-mono font-bold text-sm ${getAccuracyColorClass(Number(nb.accuracy), Number(nb.targetAccuracy), nb.status)}`}
                            >
                              {nb.accuracy}%
                            </p>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">
                              Revisão
                            </p>
                            <p
                              className={`font-mono font-bold text-sm ${nb.nextReview && new Date(nb.nextReview) < new Date() ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}
                            >
                              {nb.nextReview
                                ? nb.nextReview
                                    .split("T")[0]
                                    .split("-")
                                    .reverse()
                                    .join("/")
                                : "--"}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startSession(nb)}
                              className="p-2 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-lg transition-colors"
                              title="Iniciar Sessão"
                            >
                              <Maximize2 size={18} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDelete(nb);
                              }}
                              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded-lg transition-colors border border-slate-300 dark:border-slate-700 hover:border-red-500"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {groupedData.sortedKeys.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-600">
            <BookOpen size={48} className="mb-4 opacity-50" />
            <p className="text-sm">
              Nenhum caderno encontrado com este filtro.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        // ... (Modal code kept identical) ...
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil size={24} className="text-green-500" />{" "}
                {editingId
                  ? formData.isGlobal
                    ? "Caderno Público (Template)"
                    : "Editar Caderno"
                  : "Novo Caderno"}
              </h3>
              <button
                onClick={() => !isSaving && setIsModalOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                disabled={isSaving}
              >
                <X size={28} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              {isAdmin && (
                <div className="bg-indigo-900/20 border border-indigo-500/20 p-4 rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-indigo-300">
                    Mentoria (Sincronização Específica)
                  </h4>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-indigo-300/70">
                      E-mail do aluno alvo (vazio para ATUALIZAR TODOS que têm
                      este caderno)
                    </label>
                    <input
                      type="email"
                      placeholder="ex: aluno@email.com"
                      value={targetStudentEmail}
                      onChange={(e) => setTargetStudentEmail(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-indigo-500/30 rounded-lg py-2 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    {syncMessage && (
                      <div
                        className={`text-xs font-bold ${syncMessage.type === "error" ? "text-red-400" : "text-green-400"}`}
                      >
                        {syncMessage.text}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.isGlobal && isAdmin && (
                <div className="bg-indigo-900/20 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <Copy size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-300">
                      Modo Template Global
                    </h4>
                    <p className="text-xs text-indigo-200/70 mt-1 leading-relaxed">
                      Este caderno é um template público. Ao editar, você está
                      trabalhando na sua versão pessoal privada. Se você
                      publicar alterações, uma cópia será atualizada no catálogo
                      público.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-green-500/20 pb-2">
                  <h4 className="text-sm font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center text-[8px] text-green-500">
                      1
                    </div>
                    1. IDENTIFICAÇÃO
                  </h4>

                  {/* GLOBAL TOGGLE & EXPORT */}
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleSyncField("general_info")}
                        disabled={isSyncingField === "general_info"}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        {isSyncingField === "general_info" ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Sync Info
                      </button>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          {formData.isGlobal ? (
                            <Globe size={16} />
                          ) : (
                            <Lock size={16} />
                          )}
                          Visibilidade:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              isGlobal: !prev.isGlobal,
                            }))
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.isGlobal ? "bg-indigo-600" : "bg-slate-700"}`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${formData.isGlobal ? "translate-x-4.5" : "translate-x-1"}`}
                          />
                        </button>
                        <span
                          className={`text-xs font-bold ${formData.isGlobal ? "text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {formData.isGlobal ? "Publicar Cópia" : "Privado"}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const dataStr =
                          "data:text/json;charset=utf-8," +
                          encodeURIComponent(JSON.stringify(formData, null, 2));
                        const downloadAnchorNode = document.createElement("a");
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute(
                          "download",
                          `caderno_${formData.name.replace(/\s+/g, "_").toLowerCase()}.json`,
                        );
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider transition-colors"
                      title="Exportar para JSON"
                    >
                      <Download size={14} /> Exportar JSON
                    </button>
                  </div>
                </div>

                {/* BLOCO ESTRATÉGICO: EDITAL E CAMPO LIVRE */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-[0.15em] flex items-center gap-2">
                        <FileText size={14} className="text-green-500" /> Edital
                        Alvo
                      </label>
                      <input
                        value={formData.edital}
                        onChange={(e) => handleChange("edital", e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500 transition-colors font-bold text-center"
                        placeholder="Ex: RFB 2025"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                          <Sparkles size={14} className="text-yellow-500" />{" "}
                          Campo Livre / Observações
                        </label>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleSyncField("observations")}
                            disabled={isSyncingField === "observations"}
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                          >
                            {isSyncingField === "observations" ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )}{" "}
                            Sync Obs
                          </button>
                        )}
                      </div>
                      <input
                        value={formData.subtitle}
                        onChange={(e) =>
                          handleChange("subtitle", e.target.value)
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-yellow-500 transition-colors"
                        placeholder="Use este espaço para observações rápidas, lembretes ou tags..."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                      DISCIPLINA
                    </label>
                    <select
                      required
                      value={formData.discipline}
                      onChange={(e) =>
                        handleChange("discipline", e.target.value)
                      }
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500 appearance-none cursor-pointer"
                    >
                      <option value="">Selecione a Disciplina...</option>
                      {existingDisciplines.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                      {!existingDisciplines.includes(formData.discipline) &&
                        formData.discipline && (
                          <option value={formData.discipline}>
                            {formData.discipline}
                          </option>
                        )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                      TÓPICO
                    </label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-1 pointer-events-none">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Link Caderno TEC (Ferramenta de Questões)
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleSyncField("tec_links")}
                        disabled={isSyncingField === "tec_links"}
                        className="pointer-events-auto flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                      >
                        {isSyncingField === "tec_links" ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}{" "}
                        Sync TEC
                      </button>
                    )}
                  </div>
                  {(() => {
                    const rows = formData.extraTecNotebooks || [];

                    const handleRowChange = (
                      index: number,
                      field: "link" | "comment",
                      value: string,
                    ) => {
                      const newRows = rows.map((row, i) =>
                        i === index ? { ...row, [field]: value } : row,
                      );
                      handleChange("extraTecNotebooks", newRows);
                    };

                    const addRow = () => {
                      handleChange("extraTecNotebooks", [
                        ...rows,
                        { link: "", comment: "" },
                      ]);
                    };

                    const removeRow = (index: number) => {
                      handleChange(
                        "extraTecNotebooks",
                        rows.filter((_, i) => i !== index),
                      );
                    };

                    return (
                      <div className="space-y-3">
                        {/* Primary TEC Notebook */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="relative">
                            <LinkIcon
                              className={`absolute left-3 top-3 text-slate-500 ${formData.tecLink ? "cursor-pointer hover:scale-110 hover:text-green-500 z-10 transition-all" : ""}`}
                              size={16}
                              onClick={() =>
                                formData.tecLink &&
                                window.open(formData.tecLink, "_blank")
                              }
                            />
                            <input
                              type="url"
                              value={formData.tecLink || ""}
                              onChange={(e) =>
                                handleChange("tecLink", e.target.value)
                              }
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                              placeholder="https://tecconcursos..."
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={formData.tecLinkComment || ""}
                              onChange={(e) =>
                                handleChange("tecLinkComment", e.target.value)
                              }
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                              placeholder="Comentário sobre este caderno..."
                            />
                          </div>
                          <div className="relative">
                            {formData.theoryId ? (
                              <div className="flex w-full overflow-hidden border border-slate-300 dark:border-slate-700 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingTheoryId(formData.theoryId)
                                  }
                                  className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white flex items-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <Book
                                    size={14}
                                    className="text-green-500 mr-2 flex-shrink-0"
                                  />
                                  <span className="truncate flex-1 text-left font-medium">
                                    {(() => {
                                      const t = theories.find(
                                        (x) => x.id === formData.theoryId,
                                      );
                                      return t
                                        ? `${t.discipline} - ${t.topic}`
                                        : "Teoria Não Encontrada";
                                    })()}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTheorySelectorTarget({ type: "main" });
                                    setTheorySearchTerm("");
                                    setTheorySelectorOpen(true);
                                  }}
                                  className="px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-l border-slate-300 dark:border-slate-700 text-slate-400 hover:text-green-500 transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleChange("theoryId", "")}
                                  className="px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-l border-slate-300 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setTheorySelectorTarget({ type: "main" });
                                  setTheorySearchTerm("");
                                  setTheorySelectorOpen(true);
                                }}
                                className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500 hover:border-green-500 transition-colors"
                              >
                                <span className="truncate pr-2">
                                  Atrelar Teoria...
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Extra TEC Notebooks */}
                        {rows.map((row, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                              <div className="relative">
                                <LinkIcon
                                  className={`absolute left-3 top-3 text-slate-500 ${row.link ? "cursor-pointer hover:scale-110 hover:text-green-500 z-10 transition-all" : ""}`}
                                  size={16}
                                  onClick={() =>
                                    row.link && window.open(row.link, "_blank")
                                  }
                                />
                                <input
                                  type="url"
                                  value={row.link}
                                  onChange={(e) =>
                                    handleRowChange(i, "link", e.target.value)
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                                  placeholder="Link Caderno Adicional..."
                                />
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={row.comment}
                                  onChange={(e) =>
                                    handleRowChange(
                                      i,
                                      "comment",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                                  placeholder="Comentário..."
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              className="p-2.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                              title="Remover"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addRow}
                          className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-green-500 transition-colors uppercase tracking-widest"
                        >
                          <Plus size={14} /> Incluir mais caderno TEC
                        </button>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Subtópicos
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleSyncField("subtopics")}
                        disabled={isSyncingField === "subtopics"}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                      >
                        {isSyncingField === "subtopics" ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}{" "}
                        Sync Subtópicos
                      </button>
                    )}
                  </div>
                  {(() => {
                    const rows = formData.extraSubtopics || [];

                    const handleRowChange = (
                      index: number,
                      field:
                        | "subtitle"
                        | "tecLink"
                        | "accuracy"
                        | "themeWeight"
                        | "externalLink"
                        | "comments"
                        | "errorNotebookLink"
                        | "theoryId",
                      value: string | number,
                    ) => {
                      const newRows = rows.map((row, i) =>
                        i === index ? { ...row, [field]: value } : row,
                      );
                      handleChange("extraSubtopics", newRows);
                    };

                    const addRow = () => {
                      handleChange("extraSubtopics", [
                        ...rows,
                        { subtitle: "", tecLink: "" },
                      ]);
                    };

                    const removeRow = (index: number) => {
                      handleChange(
                        "extraSubtopics",
                        rows.filter((_, i) => i !== index),
                      );
                    };

                    return (
                      <div className="space-y-2 overflow-x-auto pb-2">
                        <div className="min-w-[1000px] space-y-2">
                          {rows.map((row, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                value={row.subtitle}
                                onChange={(e) =>
                                  handleRowChange(i, "subtitle", e.target.value)
                                }
                                className="flex-1 min-w-[150px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                                placeholder="Subtópico"
                              />
                              <input
                                value={row.themeWeight || ""}
                                onChange={(e) =>
                                  handleRowChange(
                                    i,
                                    "themeWeight",
                                    e.target.value,
                                  )
                                }
                                className="w-20 shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                                placeholder="Peso"
                              />
                              <div className="relative w-28 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={row.accuracy || ""}
                                  onChange={(e) =>
                                    handleRowChange(
                                      i,
                                      "accuracy",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                                  placeholder="Acertos"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-500">
                                  %
                                </span>
                              </div>
                              <div className="relative flex-1 min-w-[150px]">
                                <LinkIcon
                                  className={`absolute left-3 top-3 text-slate-500 ${row.tecLink ? "cursor-pointer hover:scale-110 hover:text-green-500 z-10 transition-all" : ""}`}
                                  size={16}
                                  onClick={() =>
                                    row.tecLink &&
                                    window.open(row.tecLink, "_blank")
                                  }
                                />
                                <input
                                  type="url"
                                  value={row.tecLink}
                                  onChange={(e) =>
                                    handleRowChange(
                                      i,
                                      "tecLink",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                                  placeholder="Link Caderno TEC..."
                                />
                              </div>
                              <div className="relative flex-1 min-w-[150px]">
                                <LinkIcon
                                  className={`absolute left-3 top-3 text-slate-500 ${row.errorNotebookLink ? "cursor-pointer hover:scale-110 hover:text-red-500 z-10 transition-all" : ""}`}
                                  size={16}
                                  onClick={() =>
                                    row.errorNotebookLink &&
                                    window.open(row.errorNotebookLink, "_blank")
                                  }
                                />
                                <input
                                  type="url"
                                  value={row.errorNotebookLink || ""}
                                  onChange={(e) =>
                                    handleRowChange(
                                      i,
                                      "errorNotebookLink",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                                  placeholder="Caderno de Erros..."
                                />
                              </div>
                              <div className="relative flex-1 min-w-[150px]">
                                <LinkIcon
                                  className={`absolute left-3 top-3 text-slate-500 ${row.externalLink ? "cursor-pointer hover:scale-110 hover:text-green-500 z-10 transition-all" : ""}`}
                                  size={16}
                                  onClick={() =>
                                    row.externalLink &&
                                    window.open(row.externalLink, "_blank")
                                  }
                                />
                                <input
                                  type="url"
                                  value={row.externalLink || ""}
                                  onChange={(e) =>
                                    handleRowChange(
                                      i,
                                      "externalLink",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                                  placeholder="Link Externo..."
                                />
                              </div>
                              <div className="relative flex-1 min-w-[200px]">
                                {row.theoryId ? (
                                  <div className="flex w-full overflow-hidden border border-slate-300 dark:border-slate-700 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewingTheoryId(row.theoryId!)
                                      }
                                      className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white flex items-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                      <Book
                                        size={14}
                                        className="text-green-500 mr-2 flex-shrink-0"
                                      />
                                      <span className="truncate flex-1 text-left font-medium">
                                        {(() => {
                                          const t = theories.find(
                                            (x) => x.id === row.theoryId,
                                          );
                                          return t
                                            ? `${t.discipline} - ${t.topic}`
                                            : "Teoria Não Encontrada";
                                        })()}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTheorySelectorTarget({
                                          type: "subtopic",
                                          index: i,
                                        });
                                        setTheorySearchTerm("");
                                        setTheorySelectorOpen(true);
                                      }}
                                      className="px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-l border-slate-300 dark:border-slate-700 text-slate-400 hover:text-green-500 transition-colors"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRowChange(i, "theoryId", "")
                                      }
                                      className="px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-l border-slate-300 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTheorySelectorTarget({
                                        type: "subtopic",
                                        index: i,
                                      });
                                      setTheorySearchTerm("");
                                      setTheorySelectorOpen(true);
                                    }}
                                    className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500 hover:border-green-500 transition-colors"
                                  >
                                    <span className="truncate pr-2">
                                      Atrelar Teoria...
                                    </span>
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRow(i)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                title="Remover linha"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={addRow}
                          className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors mt-2"
                        >
                          <Plus size={14} /> Adicionar Subtópico
                        </button>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-red-400 uppercase tracking-wider">
                      Cadernos de Erros
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleSyncField("error_links")}
                        disabled={isSyncingField === "error_links"}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                      >
                        {isSyncingField === "error_links" ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}{" "}
                        Sync Erros
                      </button>
                    )}
                  </div>

                  {(() => {
                    const rows = formData.extraErrorNotebooks || [];

                    const handleRowChange = (
                      index: number,
                      field: "link" | "comment",
                      value: string,
                    ) => {
                      const newRows = rows.map((row, i) =>
                        i === index ? { ...row, [field]: value } : row,
                      );
                      handleChange("extraErrorNotebooks", newRows);
                    };

                    const addRow = () => {
                      handleChange("extraErrorNotebooks", [
                        ...rows,
                        { link: "", comment: "" },
                      ]);
                    };

                    const removeRow = (index: number) => {
                      handleChange(
                        "extraErrorNotebooks",
                        rows.filter((_, i) => i !== index),
                      );
                    };

                    return (
                      <div className="space-y-3">
                        {/* Primary Error Notebook */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="relative">
                            <XCircle
                              className={`absolute left-3 top-3 text-red-500 ${formData.errorNotebookLink ? "cursor-pointer hover:scale-110 hover:brightness-125 z-10 transition-all" : "opacity-70"}`}
                              size={16}
                              onClick={() =>
                                formData.errorNotebookLink &&
                                window.open(
                                  formData.errorNotebookLink,
                                  "_blank",
                                )
                              }
                            />
                            <input
                              type="url"
                              value={formData.errorNotebookLink}
                              onChange={(e) =>
                                handleChange(
                                  "errorNotebookLink",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-red-500/20 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 placeholder-red-900/50"
                              placeholder="Link do Caderno de Erros Principal..."
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={formData.errorNotebookComment || ""}
                              onChange={(e) =>
                                handleChange(
                                  "errorNotebookComment",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                              placeholder="Comentário sobre este caderno..."
                            />
                          </div>
                        </div>

                        {/* Extra Error Notebooks */}
                        {rows.map((row, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                              <div className="relative">
                                <XCircle
                                  className={`absolute left-3 top-3 text-red-500 ${row.link ? "cursor-pointer hover:scale-110 hover:brightness-125 z-10 transition-all" : "opacity-70"}`}
                                  size={16}
                                  onClick={() =>
                                    row.link && window.open(row.link, "_blank")
                                  }
                                />
                                <input
                                  type="url"
                                  value={row.link}
                                  onChange={(e) =>
                                    handleRowChange(i, "link", e.target.value)
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-red-500/20 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 placeholder-red-900/50"
                                  placeholder="Link Adicional..."
                                />
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={row.comment}
                                  onChange={(e) =>
                                    handleRowChange(
                                      i,
                                      "comment",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                                  placeholder="Comentário..."
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              className="p-2.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                              title="Remover"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addRow}
                          className="flex items-center gap-2 text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                        >
                          <Plus size={14} /> Incluir mais caderno de erros
                        </button>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                        Questões Favoritas
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleSyncField("favorite_questions")}
                          disabled={isSyncingField === "favorite_questions"}
                          className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                        >
                          {isSyncingField === "favorite_questions" ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Send size={12} />
                          )}{" "}
                          Sync Favs
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Star
                        className={`absolute left-3 top-3 text-yellow-500 ${formData.favoriteQuestionsLink ? "cursor-pointer hover:scale-110 hover:brightness-125 z-10 transition-all" : "opacity-70"}`}
                        size={16}
                        onClick={() =>
                          formData.favoriteQuestionsLink &&
                          window.open(formData.favoriteQuestionsLink, "_blank")
                        }
                      />
                      <input
                        type="url"
                        value={formData.favoriteQuestionsLink}
                        onChange={(e) =>
                          handleChange("favoriteQuestionsLink", e.target.value)
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-yellow-500/20 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-yellow-500 placeholder-yellow-900/50"
                        placeholder="Link Favoritas..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Links Externos
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSyncField("external_links")}
                      disabled={isSyncingField === "external_links"}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                    >
                      {isSyncingField === "external_links" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}{" "}
                      Sync Links Ext
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                      Link Externo 1
                    </label>
                    <div className="relative">
                      <Book
                        className={`absolute left-3 top-3 text-slate-500 ${formData.lawLink ? "cursor-pointer hover:scale-110 hover:text-green-500 z-10 transition-all" : ""}`}
                        size={16}
                        onClick={() =>
                          formData.lawLink &&
                          window.open(formData.lawLink, "_blank")
                        }
                      />
                      <input
                        type="url"
                        value={formData.lawLink}
                        onChange={(e) =>
                          handleChange("lawLink", e.target.value)
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                        placeholder=""
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.lawLinkComment || ""}
                      onChange={(e) =>
                        handleChange("lawLinkComment", e.target.value)
                      }
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-green-500"
                      placeholder="Anotação..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-purple-400 mb-1 uppercase tracking-wider">
                      Link Externo 2
                    </label>
                    <div className="relative">
                      <FileCode
                        className={`absolute left-3 top-3 text-purple-500 ${formData.obsidianLink ? "cursor-pointer hover:scale-110 hover:brightness-125 z-10 transition-all" : "opacity-70"}`}
                        size={16}
                        onClick={() =>
                          formData.obsidianLink &&
                          window.open(formData.obsidianLink, "_blank")
                        }
                      />
                      <input
                        type="url"
                        value={formData.obsidianLink}
                        onChange={(e) =>
                          handleChange("obsidianLink", e.target.value)
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-purple-500/20 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 placeholder-purple-900/50"
                        placeholder=""
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.obsidianLinkComment || ""}
                      onChange={(e) =>
                        handleChange("obsidianLinkComment", e.target.value)
                      }
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                      placeholder="Anotação..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">
                      Link Externo 3
                    </label>
                    <div className="relative">
                      <Brain
                        className={`absolute left-3 top-3 text-cyan-500 ${formData.geminiLink1 ? "cursor-pointer hover:scale-110 hover:brightness-125 z-10 transition-all" : "opacity-70"}`}
                        size={16}
                        onClick={() =>
                          formData.geminiLink1 &&
                          window.open(formData.geminiLink1, "_blank")
                        }
                      />
                      <input
                        type="url"
                        value={formData.geminiLink1}
                        onChange={(e) =>
                          handleChange("geminiLink1", e.target.value)
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-cyan-500/20 rounded-lg py-2.5 pl-9 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500 placeholder-cyan-900/50"
                        placeholder=""
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.geminiLink1Comment || ""}
                      onChange={(e) =>
                        handleChange("geminiLink1Comment", e.target.value)
                      }
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                      placeholder="Anotação..."
                    />
                  </div>
                </div>

                {/* Planejamento e Revisão */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowPlanning(!showPlanning)}
                    className="w-full flex items-center justify-between border-b border-green-500/20 pb-2 hover:bg-green-500/5 transition-colors group"
                  >
                    <h4 className="text-sm font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center text-[8px] text-green-500">
                        2
                      </div>
                      2. PLANEJAMENTO & REVISÃO
                    </h4>
                    <ChevronDown
                      size={18}
                      className={`text-green-500 transition-transform duration-300 ${showPlanning ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showPlanning && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                        animate={{
                          height: "auto",
                          opacity: 1,
                          transitionEnd: { overflow: "visible" },
                        }}
                        exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 pt-2"
                      >
                        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-300 dark:border-slate-700 flex flex-col items-stretch gap-4 shadow-inner">
                          <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full flex flex-col gap-4">
                              <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <label className="block text-[10px] font-bold text-green-400 uppercase">
                                      Acurácia na Revisão de Hoje (%)
                                    </label>
                                    {formData.accuracyHistory &&
                                      formData.accuracyHistory.length > 0 && (
                                        <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                                          <History size={12} /> Histórico
                                        </span>
                                      )}
                                  </div>
                                  <div className="flex gap-2 w-full justify-end">
                                    <div className="relative flex-1">
                                      <input
                                        type="number"
                                        value={
                                          formData.accuracy !== undefined
                                            ? formData.accuracy
                                            : ""
                                        }
                                        onChange={(e) =>
                                          handleChange(
                                            "accuracy",
                                            e.target.value === ""
                                              ? undefined
                                              : parseInt(e.target.value),
                                          )
                                        }
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/50 rounded-lg p-2.5 pr-8 text-green-500 dark:text-green-400 font-bold outline-none focus:border-green-500 text-sm shadow-sm h-10"
                                        placeholder="Ex: 85"
                                        min="0"
                                        max="100"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                                        %
                                      </span>
                                    </div>
                                    <div className="flex items-end">
                                      <button
                                        type="button"
                                        onClick={handleConcludeReview}
                                        disabled={isSaving}
                                        className="w-full h-10 px-6 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 border border-green-500/50"
                                      >
                                        {isSaving ? (
                                          <Loader2
                                            size={18}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <CheckCircle2 size={18} />
                                        )}
                                        Concluir
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="group relative w-full md:w-1/3">
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase flex items-center gap-1">
                                    Meta de Acertos (%)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={formData.targetAccuracy}
                                      onChange={(e) =>
                                        handleChange(
                                          "targetAccuracy",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/50 rounded-lg p-2.5 pr-8 text-slate-900 dark:text-white outline-none focus:border-green-500 text-sm shadow-sm h-10"
                                      placeholder="90"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {computedNextReviewData?.isNotStarted ? (
                                <div className="flex flex-col mt-3 gap-1 p-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700/50">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <span className="uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                      <BrainCircuit size={16} /> Algoritmo
                                      Atena:
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                                      <PlayCircle size={16} /> Aguardando Início
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 mt-1 italic">
                                    Este caderno entrará no fluxo de revisão
                                    apenas após o primeiro estudo.
                                  </p>
                                </div>
                              ) : (
                                computedNextReviewData && (
                                  <div className="flex flex-col mt-3 gap-1 p-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700/50">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                      <span className="uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                        <BrainCircuit size={16} /> Algoritmo
                                        Atena:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <HeatmapCalendar
                                          value={computedNextReviewData.date}
                                          notebooks={notebooks}
                                          activeCycle={cycles.find(
                                            (c) => c.id === activeCycleId,
                                          )}
                                          onChange={(newDate) => {
                                            const dateStr = newDate
                                              .toISOString()
                                              .split("T")[0];
                                            const dateWithTime = new Date(
                                              dateStr + "T12:00:00.000Z",
                                            );
                                            handleChange(
                                              "nextReview",
                                              dateWithTime.toISOString(),
                                            );
                                          }}
                                        />
                                        <span className="text-slate-500 text-[9px] font-normal">
                                          {computedNextReviewData.label}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {formData.accuracyHistory &&
                            formData.accuracyHistory.length > 0 && (
                              <div className="border-t border-slate-300 dark:border-slate-700/50 pt-2 flex gap-2 overflow-x-auto pb-1 min-h-[45px]">
                                {formData.accuracyHistory.map((h, i) => (
                                  <div
                                    key={i}
                                    className="group relative flex flex-col items-center bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 min-w-[60px]"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => removeHistoryItem(i)}
                                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-slate-900 dark:text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10 cursor-pointer shadow-sm"
                                    >
                                      <X size={10} strokeWidth={3} />
                                    </button>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {new Date(h.date).toLocaleDateString(
                                        undefined,
                                        { day: "2-digit", month: "2-digit" },
                                      )}
                                    </span>
                                    <span
                                      className={`text-xs font-bold ${getAccuracyColorClass(Number(h.accuracy), Number(formData.targetAccuracy), formData.status)}`}
                                    >
                                      {h.accuracy}%
                                    </span>
                                  </div>
                                ))}
                                <div className="flex items-center text-xs text-slate-500 gap-1 ml-2">
                                  <TrendingUp size={16} />
                                </div>
                              </div>
                            )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowDisciplineWeights(!showDisciplineWeights)
                  }
                  className="w-full flex items-center justify-between border-b border-green-500/20 pb-2 hover:bg-green-500/5 transition-colors group"
                >
                  <h4 className="text-sm font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center text-[8px] text-green-500">
                      3
                    </div>
                    3. DADOS GERAIS & PESOS
                  </h4>
                  <ChevronDown
                    size={18}
                    className={`text-green-500 transition-transform duration-300 ${showDisciplineWeights ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {showDisciplineWeights && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transitionEnd: { overflow: "visible" },
                      }}
                      exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-4 pt-4">
                        <div className="flex justify-end mb-2">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSyncField("weights")}
                              disabled={isSyncingField === "weights"}
                              className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                            >
                              {isSyncingField === "weights" ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Send size={12} />
                              )}{" "}
                              Sync Pesos
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="group relative">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase flex items-center gap-1 cursor-help">
                              Peso{" "}
                              <HelpCircle
                                size={12}
                                className="text-slate-600"
                              />
                            </label>
                            <select
                              value={formData.weight}
                              onChange={(e) =>
                                handleChange("weight", e.target.value)
                              }
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-green-500 text-sm"
                            >
                              {Object.values(Weight).map((w) => (
                                <option key={w} value={w}>
                                  {w}
                                </option>
                              ))}
                            </select>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl text-xs z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <strong className="block text-green-400">
                                {SCORE_TOOLTIPS.weight.title}
                              </strong>
                              <span className="text-slate-500 dark:text-slate-400">
                                {SCORE_TOOLTIPS.weight.desc}
                              </span>
                            </div>
                          </div>

                          <div className="group relative">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase flex items-center gap-1 cursor-help">
                              Relevância{" "}
                              <HelpCircle
                                size={12}
                                className="text-slate-600"
                              />
                            </label>
                            <select
                              value={formData.relevance}
                              onChange={(e) =>
                                handleChange("relevance", e.target.value)
                              }
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-green-500 text-sm"
                            >
                              {Object.values(Relevance).map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl text-xs z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <strong className="block text-green-400">
                                {SCORE_TOOLTIPS.relevance.title}
                              </strong>
                              <span className="text-slate-500 dark:text-slate-400">
                                {SCORE_TOOLTIPS.relevance.desc}
                              </span>
                            </div>
                          </div>

                          <div className="group relative">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase flex items-center gap-1 cursor-help">
                              Tendência{" "}
                              <HelpCircle
                                size={12}
                                className="text-slate-600"
                              />
                            </label>
                            <select
                              value={formData.trend}
                              onChange={(e) =>
                                handleChange("trend", e.target.value)
                              }
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-green-500 text-sm"
                            >
                              {Object.values(Trend).map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl text-xs z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <strong className="block text-green-400">
                                {SCORE_TOOLTIPS.trend.title}
                              </strong>
                              <span className="text-slate-500 dark:text-slate-400">
                                {SCORE_TOOLTIPS.trend.desc}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center justify-between shadow-inner">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              Score Atena (Urgência)
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Nota final gerada pelo algoritmo (0-100).
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-[9px] block text-slate-500 uppercase font-bold">
                                Auto
                              </span>
                              <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                                {calculatedScore}
                              </span>
                            </div>
                            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                            <div className="text-right">
                              <span className="text-[9px] block text-green-500 uppercase font-bold">
                                Final (Editável)
                              </span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={
                                  formData.customScore !== ""
                                    ? formData.customScore
                                    : calculatedScore
                                }
                                onChange={(e) =>
                                  handleChange("customScore", e.target.value)
                                }
                                className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white text-lg focus:border-green-500 outline-none p-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFineTuning(!showFineTuning)}
                  className="w-full flex items-center justify-between border-b border-green-500/20 pb-2 hover:bg-green-500/5 transition-colors group"
                >
                  <h4 className="text-sm font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center text-[8px] text-green-500">
                      4
                    </div>
                    4. AJUSTE DA REVISÃO
                  </h4>
                  <div className="flex items-center gap-3">
                    {!showFineTuning && (
                      <div className="hidden md:flex items-center gap-1">
                        {[
                          { factor: 1, label: "Normal" },
                          { factor: 2, label: "Turbo 2x" },
                          { factor: 3, label: "Turbo 3x" },
                          { factor: 4, label: "Max 4x" },
                        ].map((mode) => (
                          <span
                            key={mode.factor}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${currentFactor === mode.factor ? "bg-green-600 text-white border-green-500" : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}
                          >
                            {mode.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <ChevronDown
                      size={18}
                      className={`text-green-500 transition-transform duration-300 ${showFineTuning ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {showFineTuning && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transitionEnd: { overflow: "visible" },
                      }}
                      exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-end gap-1 mb-2">
                        {[
                          { factor: 1, label: "Normal" },
                          { factor: 2, label: "Turbo 2x" },
                          { factor: 3, label: "Turbo 3x" },
                          { factor: 4, label: "Max 4x" },
                        ].map((mode) => (
                          <button
                            type="button"
                            key={mode.factor}
                            onClick={() => applyAcceleration(mode.factor)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 border ${currentFactor === mode.factor ? "bg-green-600 text-white border-green-500" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-700 hover:text-white"}`}
                          >
                            {mode.factor > 1 && <Zap size={10} />}
                            {mode.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {/* Meta field moved to review section */}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ORDERED_ALGO_KEYS.map((key) => {
                          const val =
                            currentIntervals[
                              key as keyof typeof currentIntervals
                            ];
                          return (
                            <div key={key} className="group relative">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-help flex items-center gap-1">
                                {INTERVAL_LABELS[key] || key}
                                <HelpCircle
                                  size={12}
                                  className="text-slate-600"
                                />
                              </label>
                              <input
                                type="number"
                                value={val}
                                onChange={(e) =>
                                  handleUpdateAlgoInterval(
                                    key,
                                    parseFloat(e.target.value),
                                  )
                                }
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white text-center font-bold outline-none focus:border-green-500"
                              />
                              {ALGO_TOOLTIPS[key] && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl text-xs z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <strong className="block text-green-400 mb-1">
                                    {ALGO_TOOLTIPS[key].title}
                                  </strong>
                                  <span className="text-slate-600 dark:text-slate-300 leading-tight block">
                                    {ALGO_TOOLTIPS[key].desc}
                                  </span>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center border-b border-green-500/20 pb-2">
                  <h4 className="text-sm font-bold text-green-500 uppercase tracking-widest">
                    5. Rascunhos & Anotações
                  </h4>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSyncField("summary_and_images")}
                      disabled={isSyncingField === "summary_and_images"}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                    >
                      {isSyncingField === "summary_and_images" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}{" "}
                      Sync Resumo
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                      Anotações / Resumo
                    </label>
                    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                      <ReactQuill
                        theme="snow"
                        value={formData.notes}
                        onChange={(val) => handleChange("notes", val)}
                        modules={quillModules}
                        formats={quillFormats}
                        className="h-[500px] text-slate-900 dark:text-white"
                        placeholder="Mnemônicos, resumos, pontos importantes..."
                      />
                    </div>
                  </div>
                  <div className="flex flex-col h-full">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                      Galeria de Mapas Mentais
                    </label>
                    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 min-h-[200px] flex flex-col">
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {formData.images.map((img, idx) => (
                          <div
                            key={idx}
                            draggable
                            onDragStart={(e) => handleImageDragStart(e, idx)}
                            onDrop={(e) => handleImageDrop(e, idx)}
                            onDragOver={handleImageDragOver}
                            className="relative group aspect-square bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 hover:border-green-500 transition-colors cursor-pointer"
                          >
                            <img
                              src={img}
                              draggable={false}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              onClick={() => setLightboxIndex(idx)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                              <ZoomIn
                                size={18}
                                className="text-slate-900 dark:text-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(idx);
                              }}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-slate-700/50 transition-colors text-slate-500 hover:text-green-500"
                        >
                          <Plus size={28} />
                          <span className="text-[10px] uppercase font-bold mt-1">
                            Add Imagem
                          </span>
                        </div>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                      />
                      <p className="text-[10px] text-slate-500 mt-auto text-center italic">
                        Suporta múltiplas imagens. Clique em uma imagem para
                        ampliar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4">
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                disabled={isSaving}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-500 font-bold shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2 disabled:bg-green-800 disabled:text-green-400 disabled:cursor-wait"
              >
                {isSaving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                {isSaving
                  ? "Salvando..."
                  : formData.isGlobal
                    ? isAdmin
                      ? "Salvar e Publicar Cópia"
                      : "Salvar na Minha Biblioteca"
                    : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theory Selector Modal */}
      {theorySelectorOpen && theorySelectorTarget && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Book size={18} className="text-green-500" /> Selecionar Teoria
                da Biblioteca Atena
              </h3>
              <button
                type="button"
                onClick={() => setTheorySelectorOpen(false)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search
                  className="absolute left-3 top-3 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  value={theorySearchTerm}
                  onChange={(e) => setTheorySearchTerm(e.target.value)}
                  placeholder="Buscar por disciplina, tópico ou subtópico..."
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pl-9 text-sm text-slate-900 dark:text-white outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {theories
                .filter((t) =>
                  (t.discipline + " " + t.topic + " " + (t.subtopic || ""))
                    .toLowerCase()
                    .includes(theorySearchTerm.toLowerCase()),
                )
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (theorySelectorTarget.type === "main") {
                        handleChange("theoryId", t.id);
                      } else if (
                        theorySelectorTarget.type === "subtopic" &&
                        theorySelectorTarget.index !== undefined
                      ) {
                        const rows = formData.extraSubtopics || [];
                        const newRows = rows.map((r, i) =>
                          i === theorySelectorTarget.index
                            ? { ...r, theoryId: t.id }
                            : r,
                        );
                        handleChange("extraSubtopics", newRows);
                      }
                      setTheorySelectorOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-green-500 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t.discipline}
                      </p>
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {t.topic}
                      </p>
                      {t.subtopic && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {t.subtopic}
                        </p>
                      )}
                    </div>
                    <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 group-hover:border-green-500 flex items-center justify-center">
                      {((theorySelectorTarget.type === "main" &&
                        formData.theoryId === t.id) ||
                        (theorySelectorTarget.type === "subtopic" &&
                          theorySelectorTarget.index !== undefined &&
                          formData.extraSubtopics[theorySelectorTarget.index]
                            ?.theoryId === t.id)) && (
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
              {theories.length === 0 && (
                <p className="text-center text-slate-500 text-sm mt-4">
                  Nenhuma teoria disponível na sua Biblioteca.
                </p>
              )}
              {theories.length > 0 &&
                theories.filter((t) =>
                  (t.discipline + " " + t.topic + " " + (t.subtopic || ""))
                    .toLowerCase()
                    .includes(theorySearchTerm.toLowerCase()),
                ).length === 0 && (
                  <p className="text-center text-slate-500 text-sm mt-4">
                    Nenhuma teoria encontrada para esta busca.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Viewing Theory Viewer Modal */}
      {viewingTheoryId && (
        <div
          className={`fixed inset-0 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center ${isTheoryFullscreen ? "" : "p-4"}`}
        >
          <div
            className={`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl flex flex-col ${isTheoryFullscreen ? "w-full h-full" : "rounded-2xl max-w-5xl h-[90vh]"}`}
          >
            <div
              className={`p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50 ${isTheoryFullscreen ? "" : "rounded-t-2xl"}`}
            >
              <h3 className="font-bold flex items-center gap-2">
                <Book size={18} className="text-[#ff6b00]" /> Visualizando
                Teoria
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTheoryFullscreen(!isTheoryFullscreen)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  {isTheoryFullscreen ? (
                    <Minimize2 size={22} />
                  ) : (
                    <Maximize2 size={22} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTheoryId(null)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white ml-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {(() => {
                const t = theories.find((x) => x.id === viewingTheoryId);
                if (!t)
                  return (
                    <div className="p-8 text-center text-slate-500">
                      Teoria não encontrada.
                    </div>
                  );
                return <TheoryViewer theory={t} />;
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Edital Processing Modal */}
      {showEditalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Sparkles className="text-blue-500" /> Analisar Edital com IA
              </h2>
              <button onClick={() => !isProcessingEdital && setShowEditalModal(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Cole o texto do edital abaixo. A Atena usará IA para extrair disciplinas e tópicos, e compará-los com seu banco de assuntos atual.
              </p>
              <textarea
                value={localEditalText}
                onChange={(e) => setLocalEditalText(e.target.value)}
                placeholder="Cole o conteúdo programático do edital aqui..."
                className="w-full h-64 p-4 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button
                onClick={() => setShowEditalModal(false)}
                disabled={isProcessingEdital}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={processEditalText}
                disabled={isProcessingEdital || !localEditalText.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessingEdital ? (
                   <>
                     <Loader2 size={18} className="animate-spin" />
                     Processando...
                   </>
                ) : (
                  <>
                    <BrainCircuit size={18} />
                    Analisar Edital
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
