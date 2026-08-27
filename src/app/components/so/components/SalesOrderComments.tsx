import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, User as UserIcon, Reply, X, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../context/hooks/useAuth";
import { useAddSOCommentMutation, useUpdateSOCommentMutation, useDeleteSOCommentMutation } from "../hooks/useSOComments";
import { useUsersQuery } from "../../../services/queries";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAtUtc: string;
  isEdited?: boolean;
  isDeleted?: boolean;
}

interface SalesOrderCommentsProps {
  salesOrderId: string;
  comments?: Comment[] | null;
}

export function SalesOrderComments({ salesOrderId, comments }: SalesOrderCommentsProps) {
  const { currentUser } = useAuth();
  const [content, setContent] = useState("");
  const addCommentMutation = useAddSOCommentMutation();
  const updateCommentMutation = useUpdateSOCommentMutation();
  const deleteCommentMutation = useDeleteSOCommentMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const { data: users } = useUsersQuery();
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const SUGGESTIONS = React.useMemo(() => {
    const roles = ['Sales', 'Engineering', 'Engineering Supervisor', 'QC', 'Owner', 'Admin', 'Finance', 'Purchasing'];
    const names = users?.map(u => u.name) || [];
    return Array.from(new Set([...roles, ...names]));
  }, [users]);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const filteredSuggestions = SUGGESTIONS.filter(s => s.toLowerCase().includes(suggestionFilter.toLowerCase()));

  const handleSelectSuggestion = (suggestion: string) => {
    const words = content.split(" ");
    words.pop();
    const newContent = [...words, `@${suggestion} `].join(" ");
    setContent(newContent);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContent(val);
    const lastWord = val.split(" ").pop();
    if (lastWord && lastWord.startsWith("@")) {
      setShowSuggestions(true);
      setSuggestionFilter(lastWord.substring(1));
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filteredSuggestions.length > 0) {
          e.preventDefault();
          handleSelectSuggestion(filteredSuggestions[suggestionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showSuggestions && filteredSuggestions.length > 0) {
      handleSelectSuggestion(filteredSuggestions[suggestionIndex]);
      return;
    }

    if (!content.trim() || !currentUser) return;

    let finalContent = content.trim();
    if (editingComment) {
      // Preserve the reply quote if it existed in the original comment
      const replyRegex = /^>\*\*Membalas @[^*]+\*\*\n(?:>.*\n)*/;
      const match = editingComment.content.match(replyRegex);
      if (match) {
        finalContent = match[0] + finalContent;
      }

      if (finalContent.length > 2000) {
        alert("Pesan terlalu panjang (maksimal 2000 karakter termasuk balasan).");
        return;
      }

      updateCommentMutation.mutate(
        { salesOrderId, commentId: editingComment.id, content: finalContent },
        {
          onSuccess: () => {
            setContent("");
            setEditingComment(null);
          }
        }
      );
      return;
    }

    if (replyTo) {
      const quoted = replyTo.content.split('\n').map(l => `>${l}`).join('\n');
      finalContent = `>**Membalas @${replyTo.userName}**\n${quoted}\n${finalContent}`;
    }

    if (finalContent.length > 2000) {
      alert("Pesan terlalu panjang (maksimal 2000 karakter termasuk kutipan balasan). Silakan hapus sebagian teks.");
      return;
    }

    addCommentMutation.mutate(
      {
        salesOrderId,
        userId: currentUser.id,
        userName: currentUser.name,
        content: finalContent
      },
      {
        onSuccess: () => {
          setContent("");
          setReplyTo(null);
        }
      }
    );
  };

  const startEdit = (c: Comment) => {
    setEditingComment(c);
    
    // For quoted replies, remove the quote block to just edit the actual text
    // E.g. >**Membalas @User**\n>quote...\ntext
    const replyRegex = /^>\*\*Membalas @[^*]+\*\*\n(?:>.*\n)*([\s\S]*)/;
    const match = c.content.match(replyRegex);
    if (match) {
      setContent(match[1]);
    } else {
      setContent(c.content);
    }
    
    setReplyTo(null);
    inputRef.current?.focus();
  };


  const handleDelete = (commentId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pesan ini?")) {
      deleteCommentMutation.mutate({ salesOrderId, commentId });
    }
  };

  const commentList = comments || [];

  const prevCommentCount = useRef(comments?.length || 0);

  useEffect(() => {
    if (commentsContainerRef.current) {
      const container = commentsContainerRef.current;
      // Only smooth scroll if we already had comments and added a new one (not on initial fetch)
      const isNewComment = prevCommentCount.current > 0 && commentList.length > prevCommentCount.current;
      
      if (isNewComment) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
      
      prevCommentCount.current = commentList.length;
    }
  }, [commentList]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="border-b border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-500" />
          Komentar & Diskusi ({commentList.length})
        </h3>
      </div>
      <div ref={commentsContainerRef} className="p-4 bg-gray-50/50 max-h-[400px] overflow-y-auto flex flex-col gap-4">
        {commentList.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">
            Belum ada komentar.
          </div>
        ) : (
          commentList.map((c) => (
            <div key={c.id} className={`flex flex-col group max-w-[85%] ${c.userId === currentUser?.id ? 'self-end items-end' : 'self-start items-start'}`}>
              <div className={`flex items-center gap-2 mb-1 px-1 relative ${c.userId === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {c.userName} &bull; {new Date(c.createdAtUtc?.endsWith("Z") ? c.createdAtUtc : c.createdAtUtc + "Z").toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                  {c.isEdited && !c.isDeleted && <span className="ml-1 italic opacity-75">(edited)</span>}
                </span>

                {!c.isDeleted && (
                  <div className={`absolute top-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-gray-100 rounded-md overflow-hidden ${c.userId === currentUser?.id ? 'right-full mr-2' : 'left-full ml-2'}`}>
                    <button 
                      onClick={() => setReplyTo(c)} 
                      className="text-[11px] font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-1 px-2 py-1.5 transition-colors"
                    >
                      <Reply size={13} /> Balas
                    </button>
                    {c.userId === currentUser?.id && (
                      <>
                        <div className="w-px h-4 bg-gray-100"></div>
                        <button 
                          onClick={() => startEdit(c)} 
                          className="text-[11px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1 px-2 py-1.5 transition-colors"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <div className="w-px h-4 bg-gray-100"></div>
                        <button 
                          onClick={() => handleDelete(c.id)} 
                          className="text-[11px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-1 px-2 py-1.5 transition-colors"
                        >
                          <Trash2 size={13} /> Hapus
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap ${c.isDeleted ? 'bg-gray-100 border border-gray-200 text-gray-400 italic' : c.userId === currentUser?.id ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'}`}>
                {c.isDeleted ? (
                  "pesan ini telah dihapus"
                ) : (
                  c.content.split('\n').map((line, lineIndex) => {
                    const isQuote = line.startsWith('>');
                    const displayText = isQuote ? line.substring(1) : line;
                    
                    return (
                      <div key={lineIndex} className={isQuote ? `border-l-2 pl-2 my-0.5 text-xs opacity-80 ${c.userId === currentUser?.id ? 'border-blue-200 bg-blue-600/20' : 'border-blue-300 bg-gray-50'} py-0.5 rounded-r` : 'min-h-[1rem]'}>
                        {displayText.split(/(@[\w\s]+)/g).map((part, i) => {
                          if (part.startsWith('@')) {
                            return <span key={i} className={`font-semibold ${c.userId === currentUser?.id ? 'text-blue-100 bg-blue-600/30' : 'text-blue-600 bg-blue-50'} px-1 py-0.5 rounded`}>{part}</span>;
                          }
                          if (isQuote && part.includes('**')) {
                            const boldParts = part.split('**');
                            return boldParts.map((bp, bi) => bi % 2 === 1 ? <strong key={bi}>{bp}</strong> : bp);
                          }
                          return <span key={i} className="break-words">{part}</span>;
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-gray-100 bg-white relative">
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10 flex flex-col max-h-48 overflow-y-auto">
            {filteredSuggestions.map((sug, idx) => (
              <div 
                key={sug}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-blue-50 ${idx === suggestionIndex ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                onClick={() => handleSelectSuggestion(sug)}
                onMouseEnter={() => setSuggestionIndex(idx)}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${idx === suggestionIndex ? 'bg-blue-200' : 'bg-gray-100'}`}>
                  <UserIcon size={12} className={idx === suggestionIndex ? 'text-blue-700' : 'text-gray-500'} />
                </div>
                {sug}
              </div>
            ))}
          </div>
        )}
        {editingComment && (
          <div className="flex justify-between items-center bg-blue-50 px-3 py-2 mb-2 rounded border border-blue-200 text-xs">
            <div className="flex gap-2 items-center text-blue-700 truncate">
              <Pencil size={14} className="text-blue-500" />
              <span>Mengedit pesan...</span>
            </div>
            <button type="button" onClick={() => { setEditingComment(null); setContent(""); }} className="text-blue-400 hover:text-blue-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        {replyTo && !editingComment && (
          <div className="flex justify-between items-center bg-gray-50 px-3 py-2 mb-2 rounded border border-gray-200 text-xs">
            <div className="flex gap-2 items-center text-gray-600 truncate">
              <Reply size={14} className="text-blue-500" />
              <span>Membalas <strong>@{replyTo.userName}</strong>: {replyTo.content.replace(/>/g, '').substring(0, 50)}...</span>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Tulis komentar..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            disabled={addCommentMutation.isPending}
            autoComplete="off"
            maxLength={1800}
          />
            <button
              type="submit"
              disabled={!content.trim() || addCommentMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-[11px] text-gray-400 px-1 flex items-center gap-1">
            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">@</span>
            <span>Ketik @[Role] atau @[Nama] untuk tag seseorang (contoh: @Sales atau @Engineering)</span>
          </div>
        </form>
      </div>
    </div>
  );
}
