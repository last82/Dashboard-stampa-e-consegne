const { useState, useEffect, useCallback, useMemo, useRef } = React;


        // Componente FullCalendar
        const CalendarioFullCalendar = React.memo(function CalendarioFullCalendar({ lavori, onUpdateDataConsegna }) {
            const calendarRef = useRef(null);
            const [calendar, setCalendar] = useState(null);
            const [calendarInitialized, setCalendarInitialized] = useState(false);

            function getEventColor(lavoro) {
                if (lavoro.StatoStampa === 'COMPLETATA' || lavoro.StatoStampa === 'CONSEGNATA') {
                    return '#22c55e';
                } else if (lavoro.StatoCAD === 'RICEVUTO' && lavoro.StatoStampa !== 'COMPLETATA') {
                    return '#eab308';
                } else if (lavoro.StatoStampa === 'IN_CORSO') {
                    return '#f97316';
                } else {
                    return '#6b7280';
                }
            }

            // Inizializzazione del calendario - solo una volta
            useEffect(() => {
                if (calendarRef.current && !calendar && !calendarInitialized && window.FullCalendar) {
                    console.log('🗓️ Inizializzazione calendario...');
                    
                    const newCalendar = new window.FullCalendar.Calendar(calendarRef.current, {
                        initialView: 'dayGridMonth',
                        locale: 'it',
                        headerToolbar: {
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek'
                        },
                        height: 'auto',
                        dayMaxEvents: 3,
                        moreLinkClick: 'popover',
                        editable: true,
                        droppable: true,
                        
                        eventDrop: async function(info) {
                            const newDate = info.event.startStr;
                            console.log(`📅 Evento spostato: ${info.event.title} → ${newDate}`);
                            
                            try {
                                await onUpdateDataConsegna(info.event.id, newDate);
                            } catch (error) {
                                console.error('Errore aggiornamento:', error);
                                info.revert();
                                alert('Errore nell\'aggiornamento della data. Riprova.');
                            }
                        },
                        
                        eventMouseEnter: function(info) {
                            const props = info.event.extendedProps;
                            info.el.title = `${info.event.title}\n🏭 ${props.laboratorio}\n🖨️ ${props.tipoLavoro}\n📄 CAD: ${props.statoCAD}\n🖨️ Stampa: ${props.statoStampa}`;
                        },
                        
                        eventChange: function(info) {
                            const today = new Date();
                            const eventDate = new Date(info.event.startStr);
                            
                            if (eventDate < today) {
                                const confirm = window.confirm(
                                    `Vuoi spostare ${info.event.title} al ${eventDate.toLocaleDateString('it-IT')}? ` +
                                    `Questa è una data passata.`
                                );
                                if (!confirm) {
                                    info.revert();
                                }
                            }
                        }
                    });

                    newCalendar.render();
                    setCalendar(newCalendar);
                    setCalendarInitialized(true);
                    console.log('✅ Calendario inizializzato!');
                }

                // Cleanup solo al unmount del componente
                return () => {
                    if (calendar && calendarInitialized) {
                        console.log('🗑️ Distruzione calendario...');
                        calendar.destroy();
                        setCalendar(null);
                        setCalendarInitialized(false);
                    }
                };
            }, []); // Dipendenze vuote - si esegue solo al mount

            const events = useMemo(() =>
                lavori
                    .filter(lavoro => lavoro.DataConsegna)
                    .map(lavoro => ({
                        id: lavoro.id,
                        title: lavoro.CodicePaziente,
                        date: lavoro.DataConsegna,
                        backgroundColor: getEventColor(lavoro),
                        borderColor: getEventColor(lavoro),
                        textColor: '#ffffff',
                        extendedProps: {
                            laboratorio: lavoro.Laboratorio,
                            tipoLavoro: lavoro.TipoLavoro,
                            statoCAD: lavoro.StatoCAD,
                            statoStampa: lavoro.StatoStampa
                        }
                    })),
                [lavori]
            );

            // Aggiornamento eventi quando cambiano i lavori
            useEffect(() => {
                if (calendar && calendarInitialized && events.length > 0) {
                    console.log('🔄 Aggiornamento eventi calendario...', events.length, 'eventi');

                    // Rimuove tutti gli eventi esistenti
                    calendar.removeAllEvents();

                    // Aggiunge i nuovi eventi
                    calendar.addEventSource(events);
                }
            }, [events, calendar, calendarInitialized]);

            return (
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">📅 Calendario Consegne</h3>
                        <div className="text-sm text-gray-600">
                            <span className="mr-4">🟢 Completata</span>
                            <span className="mr-4">🟡 CAD ricevuto</span>
                            <span className="mr-4">🟠 In stampa</span>
                            <span>⚫ In attesa</span>
                        </div>
                    </div>
                    
                    {!calendarInitialized && (
                        <div className="text-center py-8">
                            <i className="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
                            <p className="text-gray-600">Caricamento calendario...</p>
                        </div>
                    )}
                    
                    <div ref={calendarRef}></div>
                </div>
            );
        });

        // ✅ COMPONENTE TIMELINE SEPARATO PER MIGLIORE GESTIONE
        const TimelineComponent = React.memo(function TimelineComponent({ lavoro, onToggleStep }) {
            function getDaysUntilDelivery(dataConsegna) {
                if (!dataConsegna) return null;
                const today = new Date();
                const delivery = new Date(dataConsegna);
                const diffTime = delivery - today;
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            function isPhaseOverdue(lavoro, phase) {
                if (lavoro.TipoLavoro !== '3D') return false;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                switch(phase) {
                    case 'richiesta':
                        return lavoro.DataRichiestaCAD && 
                               new Date(lavoro.DataRichiestaCAD) < today && 
                               lavoro.StatoCAD === 'ATTESA';
                    case 'verifica':
                        return lavoro.DataVerificaFile && 
                               new Date(lavoro.DataVerificaFile) < today && 
                               lavoro.StatoCAD === 'RICEVUTO' && 
                               lavoro.StatoStampa === 'NON_INIZIATA';
                    case 'stampa':
                        return lavoro.DataPromemoriStampa && 
                               new Date(lavoro.DataPromemoriStampa) < today && 
                               lavoro.StatoStampa === 'NON_INIZIATA';
                    case 'finale':
                        return lavoro.DataPromemoriaFinale && 
                               new Date(lavoro.DataPromemoriaFinale) < today && 
                               lavoro.StatoStampa !== 'CONSEGNATA';
                    default:
                        return false;
                }
            }

            function getSteps(lavoro) {
                if (lavoro.TipoLavoro === 'TRADIZIONALE') {
                    return {
                        step1: true,
                        step2: lavoro.StatoRicezione === 'RICEVUTO',
                        step3: lavoro.StatoSpedizione === 'SPEDITO',
                        step4: lavoro.StatoCAD === 'RICEVUTO',
                        step5: lavoro.StatoStampa === 'CONSEGNATA'
                    };
                } else {
                    return {
                        step1: true,
                        step2: lavoro.StatoRicezione === 'RICEVUTO',
                        step3: lavoro.StatoCAD === 'RICEVUTO',
                        step4: lavoro.StatoStampa === 'COMPLETATA' || lavoro.StatoStampa === 'CONSEGNATA',
                        step5: lavoro.StatoStampa === 'CONSEGNATA'
                    };
                }
            }

            const memoizedSteps = useMemo(() => getSteps(lavoro), [lavoro]);

            function getStepColor(lavoro, stepNumber) {
                const steps = memoizedSteps;
                const isCompleted = steps[`step${stepNumber}`];
                
                if (lavoro.TipoLavoro === '3D') {
                    const stepToPhase = {
                        3: 'richiesta',
                        4: 'stampa',
                        5: 'finale'
                    };
                    const currentPhase = stepToPhase[stepNumber];
                    
                    if (currentPhase && isPhaseOverdue(lavoro, currentPhase)) {
                        return 'bg-red-500';
                    }
                }
                
                if (lavoro.TipoLavoro === '3D' && stepNumber === 4) {
                    if (lavoro.StatoStampa === 'IN_CORSO') {
                        return 'bg-orange-500';
                    } else if (lavoro.StatoStampa === 'COMPLETATA' || lavoro.StatoStampa === 'CONSEGNATA') {
                        return 'bg-green-500';
                    } else {
                        return 'bg-gray-500';
                    }
                }
                
                if (isCompleted) {
                    return 'bg-green-500';
                } else {
                    return 'bg-gray-500';
                }
            }

            const steps = memoizedSteps;

            // ✅ TIMELINE DESKTOP (orizzontale)
            const renderDesktopTimeline = () => {
                const stepCount = 5;
                const labels = lavoro.TipoLavoro === 'TRADIZIONALE' ? 
                    ['', 'Inviata', 'Ricevuta', 'Spedita', 'Arrivata', 'Consegna'] :
                    ['', 'Inviata', 'Ricevuta', 'CAD', 'Stampa', 'Consegna'];

                const timelineDates = lavoro.TipoLavoro === '3D' ? [
                    null,
                    null,
                    lavoro.DataRichiestaCAD,
                    lavoro.DataPromemoriStampa,
                    lavoro.DataPromemoriaFinale
                ] : [null, null, null, null, null];

                return (
                    <div className="flex justify-between items-center mb-3 mobile-timeline-desktop">
                        {[1, 2, 3, 4, 5].map(stepNum => {
                            const isCompleted = steps[`step${stepNum}`];
                            const stepColor = getStepColor(lavoro, stepNum);
                            const stepDate = lavoro.TipoLavoro === '3D' ? timelineDates[stepNum] : null;
                            
                            const stepToPhase = {
                                3: 'richiesta',
                                4: 'stampa',
                                5: 'finale'
                            };
                            const isOverdue = isPhaseOverdue(lavoro, stepToPhase[stepNum]);

                            return (
                                <React.Fragment key={stepNum}>
                                    <div className="flex flex-col items-center">
                                        <div 
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm timeline-step ${stepColor} ${isOverdue ? 'animate-pulse' : ''}`}
                                            onClick={() => stepNum > 1 && onToggleStep(lavoro.id, stepNum, lavoro.TipoLavoro)}
                                            title={`${labels[stepNum]}${stepDate ? '\nScadenza: ' + new Date(stepDate).toLocaleDateString('it-IT') : ''}${isOverdue ? '\n⚠️ IN RITARDO!' : ''}`}
                                            style={{ cursor: stepNum > 1 ? 'pointer' : 'default' }}
                                        >
                                            {isCompleted || (stepNum === 4 && lavoro.StatoStampa === 'IN_CORSO') ? 
                                                <i className="fas fa-check"></i> : stepNum}
                                        </div>
                                        <div className="text-xs mt-1 text-center max-w-16">
                                            <div className={`font-medium leading-tight ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                                                {labels[stepNum]}
                                            </div>
                                            {stepDate && (
                                                <div className={`text-xs leading-tight ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                                    {new Date(stepDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                                    {isOverdue && <div>⚠️</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {stepNum < 5 && <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                );
            };

            // ✅ TIMELINE MOBILE (griglia 2x2 o 2x3)
            const renderMobileTimeline = () => {
                const labels = lavoro.TipoLavoro === 'TRADIZIONALE' ? 
                    ['', 'Inviata', 'Ricevuta', 'Spedita', 'Arrivata', 'Consegna'] :
                    ['', 'Inviata', 'Ricevuta', 'CAD', 'Stampa', 'Consegna'];

                const timelineDates = lavoro.TipoLavoro === '3D' ? [
                    null,
                    null,
                    lavoro.DataRichiestaCAD,
                    lavoro.DataPromemoriStampa,
                    lavoro.DataPromemoriaFinale
                ] : [null, null, null, null, null];

                const renderStep = (stepNum) => {
                    const isCompleted = steps[`step${stepNum}`];
                    const stepColor = getStepColor(lavoro, stepNum);
                    const stepDate = lavoro.TipoLavoro === '3D' ? timelineDates[stepNum] : null;
                    
                    const stepToPhase = {
                        3: 'richiesta',
                        4: 'stampa',
                        5: 'finale'
                    };
                    const isOverdue = isPhaseOverdue(lavoro, stepToPhase[stepNum]);

                    return (
                        <div 
                            key={stepNum} 
                            className={`mobile-step-grid ${stepNum === 5 && lavoro.TipoLavoro === '3D' ? 'mobile-step-full-width' : ''}`}
                        >
                            <div 
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm timeline-step mobile-timeline-step ${stepColor} ${isOverdue ? 'animate-pulse' : ''}`}
                                onClick={() => stepNum > 1 && onToggleStep(lavoro.id, stepNum, lavoro.TipoLavoro)}
                                title={`${labels[stepNum]}${stepDate ? '\nScadenza: ' + new Date(stepDate).toLocaleDateString('it-IT') : ''}${isOverdue ? '\n⚠️ IN RITARDO!' : ''}`}
                                style={{ cursor: stepNum > 1 ? 'pointer' : 'default' }}
                            >
                                {isCompleted || (stepNum === 4 && lavoro.StatoStampa === 'IN_CORSO') ? 
                                    <i className="fas fa-check"></i> : stepNum}
                            </div>
                            <div className="text-xs mt-1 text-center max-w-14 mobile-timeline-label">
                                <div className={`font-medium leading-tight ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                                    {labels[stepNum]}
                                </div>
                                {stepDate && (
                                    <div className={`text-xs leading-tight ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                        {new Date(stepDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                        {isOverdue && <div>⚠️</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                };

                return (
                    <div className="mobile-timeline-mobile">
                        {lavoro.TipoLavoro === 'TRADIZIONALE' ? (
                            // Layout 2x2 + 1 per TRADIZIONALE
                            <div className="mobile-timeline-grid">
                                {renderStep(1)}
                                {renderStep(2)}
                                {renderStep(3)}
                                {renderStep(4)}
                                <div className="mobile-step-full-width" style={{ gridColumn: '1 / -1' }}>
                                    {renderStep(5)}
                                </div>
                            </div>
                        ) : (
                            // Layout 2x2 + 1 per 3D
                            <div className="mobile-timeline-grid">
                                {renderStep(1)}
                                {renderStep(2)}
                                {renderStep(3)}
                                {renderStep(4)}
                                <div className="mobile-step-full-width" style={{ gridColumn: '1 / -1' }}>
                                    {renderStep(5)}
                                </div>
                            </div>
                        )}
                    </div>
                );
            };

            return (
                <>
                    {renderDesktopTimeline()}
                    {renderMobileTimeline()}
                </>
            );
        });

        // Componente Card Lavoro
        const CardLavoro = React.memo(function CardLavoro({ lavoro, onToggleStep, onUpdateStatus }) {
            function getDaysUntilDelivery(dataConsegna) {
                if (!dataConsegna) return null;
                const today = new Date();
                const delivery = new Date(dataConsegna);
                const diffTime = delivery - today;
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            const daysUntil = useMemo(() => getDaysUntilDelivery(lavoro.DataConsegna), [lavoro.DataConsegna]);

            return (
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500 card-hover mobile-card-content">
                    <div className="flex justify-between items-start mb-3 mobile-card-header">
                        <div className="flex items-center space-x-3 mobile-work-info">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-bold text-gray-900">{lavoro.CodicePaziente}</h3>
                                    {/* ✅ Bottone Note Prescrizione */}
                                    {lavoro.NotePrescrizione && (
                                        <button 
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
                                            onClick={() => {
                                                const modalContent = `
                                                    📋 DETTAGLI PRESCRIZIONE - ${lavoro.CodicePaziente}
                                                    
                                                    🏭 Laboratorio: ${lavoro.Laboratorio}
                                                    📅 Data Consegna: ${lavoro.DataConsegna ? new Date(lavoro.DataConsegna).toLocaleDateString('it-IT') : 'Non definita'}
                                                    🔧 Tipo Lavoro: ${lavoro.TipoLavoro}
                                                    
                                                    📝 DETTAGLI:
                                                    ${lavoro.NotePrescrizione}
                                                `;
                                                alert(modalContent);
                                            }}
                                            title="Visualizza dettagli prescrizione"
                                        >
                                            <i className="fas fa-file-text"></i>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center space-x-3 text-sm text-gray-600 mobile-work-info">
                                    <span>🏭 {lavoro.Laboratorio}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                        lavoro.TipoLavoro === '3D' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                    }`}>
                                        {lavoro.TipoLavoro === '3D' ? '🖨️ 3D' : '🔧 TRADIZIONALE'}
                                    </span>
                                    {lavoro.DataConsegna && (
                                        <span className={`font-semibold px-2 py-1 rounded ${
                                            daysUntil < 0 ? 'bg-red-100 text-red-800' :
                                            daysUntil <= 2 ? 'bg-orange-100 text-orange-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                            📅 {new Date(lavoro.DataConsegna).toLocaleDateString('it-IT')}
                                            {daysUntil !== null && (
                                                <span className="ml-1">
                                                    ({daysUntil < 0 ? `${Math.abs(daysUntil)}gg fa` : 
                                                      daysUntil === 0 ? 'Oggi' : 
                                                      `${daysUntil}gg`})
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex space-x-2 mobile-badges">
                            {/* ✅ Badge Ricezione SEMPRE per primo */}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold mobile-badge ${
                                lavoro.StatoRicezione === 'RICEVUTO' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {lavoro.StatoRicezione === 'RICEVUTO' ? '✅ Ricevuta' : '📥 In attesa'}
                            </span>
                            
                            {/* Badge specifici per tipo lavoro */}
                            {lavoro.TipoLavoro === '3D' ? (
                                <>
                                    {/* Badge CAD solo per lavori 3D */}
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold mobile-badge ${
                                        lavoro.StatoCAD === 'RICEVUTO' ? 'bg-green-100 text-green-800' :
                                        lavoro.StatoCAD === 'ATTESA' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        CAD: {lavoro.StatoCAD}
                                    </span>
                                    
                                    {/* Badge Stampa solo per lavori 3D */}
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold mobile-badge ${
                                        lavoro.StatoStampa === 'COMPLETATA' || lavoro.StatoStampa === 'CONSEGNATA' ? 'bg-green-100 text-green-800' :
                                        lavoro.StatoStampa === 'IN_CORSO' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        Stampa: {lavoro.StatoStampa}
                                    </span>
                                </>
                            ) : (
                                <>
                                    {/* Badge Spedizione per TRADIZIONALI */}
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold mobile-badge ${
                                        lavoro.StatoSpedizione === 'SPEDITO' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {lavoro.StatoSpedizione === 'SPEDITO' ? '🚚 Spedito' : '📦 Da spedire'}
                                    </span>
                                    
                                    {/* Badge Lavoro per TRADIZIONALI */}
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold mobile-badge ${
                                        lavoro.StatoCAD === 'RICEVUTO' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {lavoro.StatoCAD === 'RICEVUTO' ? '✅ Arrivato' : '🚛 In arrivo'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ✅ Timeline Component - Gestisce automaticamente desktop/mobile */}
                    <TimelineComponent lavoro={lavoro} onToggleStep={onToggleStep} />

                    <div className="flex justify-between items-center">
                        <div className="flex space-x-2 mobile-controls">
                            {lavoro.TipoLavoro === '3D' ? (
                                <>
                                    <select 
                                        value={lavoro.StatoRicezione}
                                        onChange={(e) => onUpdateStatus(lavoro.id, 'StatoRicezione', e.target.value)}
                                        className="text-xs border rounded px-2 py-1 mobile-dropdown"
                                    >
                                        <option value="NON_RICEVUTO">📥 Non ricevuta</option>
                                        <option value="RICEVUTO">✅ Ricevuta in LAB</option>
                                    </select>
                                    
                                    <select 
                                        value={lavoro.StatoCAD}
                                        onChange={(e) => onUpdateStatus(lavoro.id, 'StatoCAD', e.target.value)}
                                        className="text-xs border rounded px-2 py-1 mobile-dropdown"
                                    >
                                        <option value="ATTESA">CAD: Attesa</option>
                                        <option value="RICEVUTO">CAD: Ricevuto</option>
                                        <option value="MANCANTE">CAD: Mancante</option>
                                    </select>
                                    
                                    <select 
                                        value={lavoro.StatoStampa}
                                        onChange={(e) => onUpdateStatus(lavoro.id, 'StatoStampa', e.target.value)}
                                        className="text-xs border rounded px-2 py-1 mobile-dropdown"
                                    >
                                        <option value="NON_INIZIATA">Stampa: Non iniziata</option>
                                        <option value="IN_CORSO">Stampa: In corso</option>
                                        <option value="COMPLETATA">Stampa: Completata</option>
                                        <option value="CONSEGNATA">🏁 Consegnata (Archivia)</option>
                                    </select>
                                </>
                            ) : (
                                <>
                                    <select 
                                        value={lavoro.StatoRicezione}
                                        onChange={(e) => onUpdateStatus(lavoro.id, 'StatoRicezione', e.target.value)}
                                        className="text-xs border rounded px-2 py-1 mobile-dropdown"
                                    >
                                        <option value="NON_RICEVUTO">📥 Non ricevuta</option>
                                        <option value="RICEVUTO">✅ Ricevuta in LAB</option>
                                    </select>
                                    
                                    <select 
                                        value={lavoro.StatoSpedizione}
                                        onChange={(e) => onUpdateStatus(lavoro.id, 'StatoSpedizione', e.target.value)}
                                        className="text-xs border rounded px-2 py-1 mobile-dropdown"
                                    >
                                        <option value="NON_SPEDITO">📦 Non spedito</option>
                                        <option value="SPEDITO">🚚 Spedito</option>
                                    </select>
                                    
                                    <select 
                                        value={lavoro.StatoCAD}
                                        onChange={(e) => onUpdateStatus(lavoro.id, 'StatoCAD', e.target.value)}
                                        className="text-xs border rounded px-2 py-1 mobile-dropdown"
                                    >
                                        <option value="ATTESA">Lavoro: In arrivo</option>
                                        <option value="RICEVUTO">Lavoro: Arrivato</option>
                                    </select>
                                    
                                    <select 
                                        value={lavoro.StatoStampa}
                                        onChange={(e) => onUpdateStatus(lavoro.id, 'StatoStampa', e.target.value)}
                                        className="text-xs border rounded px-2 py-1 mobile-dropdown"
                                    >
                                        <option value="NON_INIZIATA">Non consegnato</option>
                                        <option value="CONSEGNATA">🏁 Consegnato (Archivia)</option>
                                    </select>
                                </>
                            )}
                        </div>
                        
                        {lavoro.TipoLavoro === '3D' && (
                            <button 
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                                onClick={() => {
                                    const timelineInfo = [
                                        `📋 Lavoro 3D: ${lavoro.CodicePaziente}`,
                                        `📅 Consegna: ${lavoro.DataConsegna ? new Date(lavoro.DataConsegna).toLocaleDateString('it-IT') : 'Non definita'}`,
                                        ``,
                                        `🗓️ TIMELINE CALCOLATA:`,
                                        `📥 Richiesta CAD: ${lavoro.DataRichiestaCAD ? new Date(lavoro.DataRichiestaCAD).toLocaleDateString('it-IT') : 'N/A'}`,
                                        `✅ Verifica File: ${lavoro.DataVerificaFile ? new Date(lavoro.DataVerificaFile).toLocaleDateString('it-IT') : 'N/A'}`,
                                        `🖨️ Promemoria Stampa: ${lavoro.DataPromemoriStampa ? new Date(lavoro.DataPromemoriStampa).toLocaleDateString('it-IT') : 'N/A'}`,
                                        `🏁 Promemoria Finale: ${lavoro.DataPromemoriaFinale ? new Date(lavoro.DataPromemoriaFinale).toLocaleDateString('it-IT') : 'N/A'}`,
                                        ``,
                                        `📁 Path CAD: ${lavoro.PathFileCAD || 'Non specificato'}`,
                                        `📝 Note: ${lavoro.NoteStampa || 'Nessuna nota'}`
                                    ].join('\n');
                                    
                                    alert(timelineInfo);
                                }}
                            >
                                <i className="fas fa-info-circle mr-1"></i>
                                Timeline
                            </button>
                        )}
                    </div>
                </div>
            );
        });

        // 🔐 HEADER CON INFORMAZIONI UTENTE
        function UserHeader({ user, onLogout }) {
            return (
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 py-3 dashboard-header">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <img 
                                    src="./logoDM.png" 
                                    alt="Studio Dottori Mandelli" 
                                    className="h-10 w-auto"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dashboard-title">
                                        🦷 Dashboard Prescrizioni 3D
                                    </h1>
                                    <p className="text-xs text-gray-600 dashboard-subtitle">
                                        {user.role === 'admin' ? 
                                            'Vista completa - Tutti i laboratori' : 
                                            `Vista filtrata - ${user.displayName}`
                                        }
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {user.displayName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {user.role === 'admin' ? '👨‍⚕️ Amministratore' : '🏭 Laboratorio'}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={onLogout}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
                                >
                                    <i className="fas fa-sign-out-alt"></i>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Dashboard Principale
        function Dashboard() {
            const { user, logout } = useAuth();
            const [lavori, setLavori] = useState([]);
            const [loading, setLoading] = useState(true);
            const [lastSync, setLastSync] = useState(new Date());
            const [autoRefresh, setAutoRefresh] = useState(true);
            const lavoriRef = useRef(lavori);

            // Aggiorna il ref ogni volta che cambiano i lavori
            useEffect(() => {
                lavoriRef.current = lavori;
            }, [lavori]);

            const loadData = useCallback(async () => {
                setLoading(true);
                try {
                    console.log('🔄 Caricamento dati da Airtable...');
                    const [timelineData, prescrizioniData] = await Promise.all([
                        fetchAirtableData(AIRTABLE_BASE_ID, TIMELINE_TABLE, AIRTABLE_TOKEN),
                        fetchAirtableData(AIRTABLE_BASE_ID, PRESCRIZIONI_TABLE, AIRTABLE_TOKEN)
                    ]);
                    
                    const prescrizioniMap = {};
                    prescrizioniData.forEach(record => {
                        const codice = record.fields.Codice;
                        if (codice) {
                            prescrizioniMap[codice] = record.fields;
                        }
                    });
                    
                    const formattedData = timelineData.map(record => {
                        const codice = record.fields.CodicePaziente;
                        const prescrizione = prescrizioniMap[codice] || {};
                        
                        return {
                            id: record.id,
                            airtableId: record.id,
                            CodicePaziente: codice || 'N/A',
                            DataConsegna: prescrizione.DataConsegna || null,
                            Laboratorio: prescrizione.Laboratorio || 'Non specificato',
                            TipoLavoro: prescrizione.TipoLavoro || '3D',
                            StatoCAD: record.fields.StatoCAD || 'ATTESA',
                            StatoStampa: record.fields.StatoStampa || 'NON_INIZIATA',
                            StatoSpedizione: record.fields.StatoSpedizione || 'NON_SPEDITO',
                            StatoRicezione: record.fields.StatoRicezione || 'NON_RICEVUTO',
                            DataRichiestaCAD: record.fields.DataRichiestaCAD || null,
                            DataVerificaFile: record.fields.DataVerificaFile || null,
                            DataPromemoriStampa: record.fields.DataPromemoriStampa || null,
                            DataPromemoriaFinale: record.fields.DataPromemoriaFinale || null,
                            PathFileCAD: record.fields.PathFileCAD || '',
                            NoteStampa: record.fields.NoteStampa || '',
                            NotePrescrizione: prescrizione.Note || '',
                            Archiviato: record.fields.Archiviato || false
                        };
                    });
                    
                    // ✅ FILTRO PER LABORATORIO
                    let lavoriFiltrati = formattedData.filter(l => !l.Archiviato);
                    
                    if (user && user.laboratorio) {
                        // Filtra solo i lavori del laboratorio dell'utente loggato
                        lavoriFiltrati = lavoriFiltrati.filter(lavoro => 
                            lavoro.Laboratorio.toLowerCase() === user.laboratorio.toLowerCase()
                        );
                        console.log(`🔍 Filtrato per laboratorio "${user.laboratorio}":`, lavoriFiltrati.length, 'lavori');
                    } else {
                        console.log('👨‍⚕️ Vista admin - mostra tutti i lavori:', lavoriFiltrati.length);
                    }
                    
                    setLavori(lavoriFiltrati);
                    setLastSync(new Date());
                    console.log('✅ Dati sincronizzati:', lavoriFiltrati.length, 'lavori visibili');
                } catch (err) {
                    console.error('❌ Errore caricamento dati:', err);
                }
                setLoading(false);
            }, [user]);

            // Primo caricamento
            useEffect(() => {
                if (user) {
                    loadData();
                }
            }, [loadData, user]);

            // 🔄 AUTO-REFRESH: Polling ogni 30 secondi quando abilitato
            useEffect(() => {
                if (!autoRefresh || !user) {
                    console.log('❌ Auto-refresh disabilitato');
                    return;
                }
                
                console.log('✅ Auto-refresh abilitato - polling ogni 30 secondi');
                const interval = setInterval(() => {
                    if (!loading && !document.hidden) {
                        console.log('🔄 Auto-refresh: esecuzione caricamento dati...');
                        loadData();
                    } else {
                        console.log('⏸️ Auto-refresh: saltato (loading o tab nascosta)');
                    }
                }, 30000); // 30 secondi per test più veloce
                
                return () => {
                    console.log('🗑️ Auto-refresh: cleanup interval');
                    clearInterval(interval);
                };
            }, [loadData, loading, autoRefresh, user]);

            // 🔄 VISIBILITY API: Refresh quando la tab torna attiva
            useEffect(() => {
                const handleVisibilityChange = () => {
                    if (!document.hidden && !loading && user) {
                        const timeSinceLastSync = new Date() - lastSync;
                        console.log('👁️ Tab tornata visibile, ultima sync:', Math.round(timeSinceLastSync/1000), 'secondi fa');
                        
                        // Refresh se sono passati più di 20 secondi dall'ultima sincronizzazione
                        if (timeSinceLastSync > 20000) {
                            console.log('🔄 Tab focus: refresh dati necessario');
                            loadData();
                        } else {
                            console.log('⏸️ Tab focus: dati già freschi, no refresh');
                        }
                    }
                };
                
                document.addEventListener('visibilitychange', handleVisibilityChange);
                console.log('👁️ Visibility listener aggiunto');
                
                return () => {
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                    console.log('🗑️ Visibility listener rimosso');
                };
            }, [loadData, loading, lastSync, user]);

            // Ordinamento lavori per data di consegna
            const lavoriOrdinati = useMemo(() => {
                const oggi = new Date();
                oggi.setHours(0, 0, 0, 0); // Reset ore per confronto corretto
                
                return [...lavori].sort((a, b) => {
                    // Lavori senza data vanno in fondo
                    if (!a.DataConsegna && !b.DataConsegna) return 0;
                    if (!a.DataConsegna) return 1;
                    if (!b.DataConsegna) return -1;
                    
                    const dataA = new Date(a.DataConsegna);
                    const dataB = new Date(b.DataConsegna);
                    
                    // Prima i lavori in scadenza (passati o oggi)
                    const scadutoA = dataA <= oggi;
                    const scadutoB = dataB <= oggi;
                    
                    if (scadutoA && !scadutoB) return -1;
                    if (!scadutoA && scadutoB) return 1;
                    
                    // Poi ordina per data crescente (più vicini in alto)
                    return dataA - dataB;
                });
            }, [lavori]);

            const toggleStep = useCallback(async (id, stepNumber, tipoLavoro) => {
                try {
                    const lavoro = lavoriRef.current.find(l => l.id === id);
                    if (!lavoro) return;

                    let updateFields = {};
                    
                    if (tipoLavoro === '3D') {
                        switch(stepNumber) {
                            case 2:
                                // Step 2: Ricezione in LAB  
                                updateFields.StatoRicezione = lavoro.StatoRicezione === 'RICEVUTO' ? 'NON_RICEVUTO' : 'RICEVUTO';
                                break;
                            case 3:
                                // Step 3: CAD
                                updateFields.StatoCAD = lavoro.StatoCAD === 'RICEVUTO' ? 'ATTESA' : 'RICEVUTO';
                                break;
                            case 4:
                                // Step 4: Stampa
                                if (lavoro.StatoStampa === 'NON_INIZIATA') {
                                    updateFields.StatoStampa = 'IN_CORSO';
                                } else if (lavoro.StatoStampa === 'IN_CORSO') {
                                    updateFields.StatoStampa = 'COMPLETATA';
                                } else if (lavoro.StatoStampa === 'COMPLETATA') {
                                    updateFields.StatoStampa = 'NON_INIZIATA';
                                } else {
                                    updateFields.StatoStampa = 'IN_CORSO';
                                }
                                break;
                            case 5:
                                // Step 5: Consegna
                                updateFields.StatoStampa = lavoro.StatoStampa === 'CONSEGNATA' ? 'COMPLETATA' : 'CONSEGNATA';
                                break;
                        }
                    } else {
                        // Lavoro TRADIZIONALE - ora con 5 step
                        switch(stepNumber) {
                            case 2:
                                // Step 2: Ricezione in LAB
                                updateFields.StatoRicezione = lavoro.StatoRicezione === 'RICEVUTO' ? 'NON_RICEVUTO' : 'RICEVUTO';
                                break;
                            case 3:
                                // Step 3: Spedizione
                                updateFields.StatoSpedizione = lavoro.StatoSpedizione === 'SPEDITO' ? 'NON_SPEDITO' : 'SPEDITO';
                                break;
                            case 4:
                                // Step 4: Arrivato (CAD)
                                updateFields.StatoCAD = lavoro.StatoCAD === 'RICEVUTO' ? 'ATTESA' : 'RICEVUTO';
                                break;
                            case 5:
                                // Step 5: Consegna
                                updateFields.StatoStampa = lavoro.StatoStampa === 'CONSEGNATA' ? 'NON_INIZIATA' : 'CONSEGNATA';
                                break;
                        }
                    }

                    // Update ottimistico
                    setLavori(prev => prev.map(l => 
                        l.id === id ? { ...l, ...updateFields } : l
                    ));

                    // Update Airtable
                    await updateAirtableRecord(AIRTABLE_BASE_ID, TIMELINE_TABLE, AIRTABLE_TOKEN, lavoro.airtableId, updateFields);
                    
                    console.log('✅ Stato aggiornato:', updateFields);
                } catch (error) {
                    console.error('❌ Errore aggiornamento:', error);
                    alert('Errore nell\'aggiornamento. Riprova.');
                    // Reload data in caso di errore
                    loadData();
                }
            }, [loadData]);

            const updateStatus = useCallback(async (id, field, value) => {
                try {
                    const lavoro = lavoriRef.current.find(l => l.id === id);
                    if (!lavoro) return;

                    const updateFields = { [field]: value };

                    // Update ottimistico
                    setLavori(prev => prev.map(l => 
                        l.id === id ? { ...l, ...updateFields } : l
                    ));

                    // Update Airtable
                    await updateAirtableRecord(AIRTABLE_BASE_ID, TIMELINE_TABLE, AIRTABLE_TOKEN, lavoro.airtableId, updateFields);
                    
                    console.log('✅ Select aggiornato:', field, '=', value);
                } catch (error) {
                    console.error('❌ Errore aggiornamento select:', error);
                    alert('Errore nell\'aggiornamento. Riprova.');
                    // Reload data in caso di errore
                    loadData();
                }
            }, [loadData]);

            const updateDataConsegna = useCallback(async (lavoroId, newDate) => {
                console.log('🔄 Inizio aggiornamento data consegna:', { lavoroId, newDate });
                console.log('📋 State lavori attuale:', lavoriRef.current.map(l => ({ id: l.id, codice: l.CodicePaziente, data: l.DataConsegna })));
                
                try {
                    const lavoro = lavoriRef.current.find(l => l.id === lavoroId);
                    if (!lavoro) {
                        console.error('❌ Lavoro non trovato:', lavoroId);
                        console.log('📋 IDs disponibili nel state:', lavoriRef.current.map(l => l.id));
                        console.log('📋 Cerco ID:', lavoroId);
                        
                        // Proviamo a trovare per airtableId
                        const lavoroByAirtableId = lavoriRef.current.find(l => l.airtableId === lavoroId);
                        if (lavoroByAirtableId) {
                            console.log('✅ Trovato lavoro usando airtableId!', lavoroByAirtableId);
                            // Usa questo lavoro e continua
                            return await updateDataConsegnaInternal(lavoroByAirtableId, lavoroId, newDate);
                        }
                        
                        alert('❌ Errore: Lavoro non trovato nel state locale');
                        return;
                    }

                    return await updateDataConsegnaInternal(lavoro, lavoroId, newDate);
                    
                } catch (error) {
                    console.error('❌ Errore completo aggiornamento data:', error);
                    alert(`❌ Errore aggiornamento data: ${error.message}`);
                    loadData();
                    throw error;
                }
            }, [loadData]); // Rimossa dependenza da lavori perché usiamo il ref

            const updateDataConsegnaInternal = async (lavoro, lavoroId, newDate) => {
                console.log('📋 Lavoro trovato:', {
                    id: lavoro.id,
                    airtableId: lavoro.airtableId,
                    codice: lavoro.CodicePaziente,
                    dataAttuale: lavoro.DataConsegna
                });

                // Update ottimistico
                setLavori(prev => prev.map(l => 
                    l.id === lavoroId ? { ...l, DataConsegna: newDate } : l
                ));
                console.log('✅ Update ottimistico completato');

                // Trova e aggiorna record Prescrizioni
                console.log('🔍 Ricerca record in tabella Prescrizioni...');
                const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PRESCRIZIONI_TABLE}`, {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Errore fetch prescrizioni: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('📊 Dati ricevuti da Prescrizioni:', {
                    totalRecords: data.records?.length || 0,
                    cercoCodice: lavoro.CodicePaziente
                });

                const prescrizioneRecord = data.records?.find(record => {
                    const recordCodice = record.fields.Codice;
                    console.log('🔍 Confronto codici:', { recordCodice, cercoCodice: lavoro.CodicePaziente });
                    return recordCodice === lavoro.CodicePaziente;
                });

                if (prescrizioneRecord) {
                    console.log('✅ Record prescrizione trovato:', {
                        id: prescrizioneRecord.id,
                        codice: prescrizioneRecord.fields.Codice,
                        dataAttuale: prescrizioneRecord.fields.DataConsegna
                    });

                    const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PRESCRIZIONI_TABLE}/${prescrizioneRecord.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            fields: {
                                DataConsegna: newDate
                            }
                        })
                    });

                    if (!updateResponse.ok) {
                        throw new Error(`Errore update prescrizioni: ${updateResponse.status} ${updateResponse.statusText}`);
                    }

                    const updateResult = await updateResponse.json();
                    console.log('✅ Data consegna aggiornata su Airtable:', {
                        codice: lavoro.CodicePaziente,
                        nuovaData: newDate,
                        result: updateResult.fields.DataConsegna
                    });

                    // Mostra notifica di successo
                    alert(`✅ Data consegna aggiornata per ${lavoro.CodicePaziente}: ${new Date(newDate).toLocaleDateString('it-IT')}`);
                    
                } else {
                    console.error('❌ Record prescrizione NON trovato per codice:', lavoro.CodicePaziente);
                    console.log('📝 Codici disponibili:', data.records?.map(r => r.fields.Codice) || []);
                    
                    alert(`❌ Record non trovato in tabella Prescrizioni per il codice: ${lavoro.CodicePaziente}`);
                    
                    // Revert update ottimistico
                    setLavori(prev => prev.map(l => 
                        l.id === lavoroId ? { ...l, DataConsegna: lavoro.DataConsegna } : l
                    ));
                }
            };

            return (
                <div className="min-h-screen bg-gray-50">
                    <UserHeader user={user} onLogout={logout} />

                    <div className="max-w-7xl mx-auto px-4 py-4 dashboard-container">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 mobile-stats">
                            <div className="bg-white rounded-lg shadow-sm p-3 mobile-stat-card">
                                <div className="flex items-center">
                                    <div className="p-1.5 bg-blue-100 rounded-lg mobile-stat-icon">
                                        <i className="fas fa-cube text-blue-600 text-sm"></i>
                                    </div>
                                    <div className="ml-2">
                                        <p className="text-xs font-medium text-gray-600 mobile-stat-text">Totale Lavori</p>
                                        <p className="text-xl font-bold text-gray-900 mobile-stat-number">{lavori.length}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg shadow-sm p-3 mobile-stat-card">
                                <div className="flex items-center">
                                    <div className="p-1.5 bg-yellow-100 rounded-lg mobile-stat-icon">
                                        <i className="fas fa-clock text-yellow-600 text-sm"></i>
                                    </div>
                                    <div className="ml-2">
                                        <p className="text-xs font-medium text-gray-600 mobile-stat-text">CAD Attesa</p>
                                        <p className="text-xl font-bold text-gray-900 mobile-stat-number">{lavori.filter(l => l.StatoCAD === 'ATTESA').length}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg shadow-sm p-3 mobile-stat-card">
                                <div className="flex items-center">
                                    <div className="p-1.5 bg-orange-100 rounded-lg mobile-stat-icon">
                                        <i className="fas fa-print text-orange-600 text-sm"></i>
                                    </div>
                                    <div className="ml-2">
                                        <p className="text-xs font-medium text-gray-600 mobile-stat-text">In Stampa</p>
                                        <p className="text-xl font-bold text-gray-900 mobile-stat-number">{lavori.filter(l => l.StatoStampa === 'IN_CORSO').length}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg shadow-sm p-3 mobile-stat-card">
                                <div className="flex items-center">
                                    <div className="p-1.5 bg-green-100 rounded-lg mobile-stat-icon">
                                        <i className="fas fa-check text-green-600 text-sm"></i>
                                    </div>
                                    <div className="ml-2">
                                        <p className="text-xs font-medium text-gray-600 mobile-stat-text">Completati</p>
                                        <p className="text-xl font-bold text-gray-900 mobile-stat-number">{lavori.filter(l => l.StatoStampa === 'COMPLETATA').length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <CalendarioFullCalendar lavori={lavori} onUpdateDataConsegna={updateDataConsegna} />

                        <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <h3 className="text-lg font-bold text-gray-900">📋 Lista Lavori con Timeline</h3>
                                    <span className="text-sm text-gray-600">
                                        📅 Ordinati per data di consegna (più urgenti in alto)
                                        {user.laboratorio && (
                                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                🔍 Filtrato: {user.displayName}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                
                                <div className="flex gap-2 items-center">
                                    {/* 🔄 Toggle Auto-refresh */}
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={autoRefresh}
                                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                                className="sr-only"
                                            />
                                            <div className={`relative w-11 h-6 rounded-full transition-colors ${autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${autoRefresh ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                            <span className="ml-2 text-sm text-gray-600">Auto-sync</span>
                                        </label>
                                    </div>
                                    
                                    {/* 🔄 Stato sincronizzazione */}
                                    <div className="text-xs text-gray-500">
                                        Ultimo aggiornamento: {lastSync.toLocaleTimeString('it-IT')}
                                    </div>
                                    
                                    {/* 🔄 Bottone refresh manuale */}
                                    <button 
                                        onClick={loadData}
                                        disabled={loading}
                                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
                                    >
                                        <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                                        {loading ? 'Caricamento...' : 'Ricarica'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {lavoriOrdinati.length === 0 ? (
                                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                                    <i className="fas fa-search text-gray-400 text-3xl mb-3"></i>
                                    <p className="text-gray-600">
                                        {user.laboratorio ? 
                                            `Nessun lavoro trovato per ${user.displayName}` : 
                                            'Nessun lavoro trovato'
                                        }
                                    </p>
                                </div>
                            ) : (
                                lavoriOrdinati.map((lavoro, index) => {
                                    const oggi = new Date();
                                    oggi.setHours(0, 0, 0, 0);
                                    const dataConsegna = lavoro.DataConsegna ? new Date(lavoro.DataConsegna) : null;
                                    const isUrgente = dataConsegna && dataConsegna <= oggi;
                                    const giorniMancanti = dataConsegna ? Math.ceil((dataConsegna - oggi) / (1000 * 60 * 60 * 24)) : null;
                                    
                                    return (
                                        <div key={lavoro.id} className="relative">
                                            {/* Badge posizione per debug e info */}
                                            <div className="absolute -left-2 top-2 z-10">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                                                    isUrgente ? 'bg-red-500 text-white' :
                                                    giorniMancanti <= 3 ? 'bg-orange-500 text-white' :
                                                    'bg-blue-500 text-white'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                            </div>
                                            
                                            {/* Card del lavoro */}
                                            <div className={`ml-4 ${isUrgente ? 'ring-2 ring-red-500' : ''}`}>
                                                <CardLavoro 
                                                    lavoro={lavoro} 
                                                    onToggleStep={toggleStep}
                                                    onUpdateStatus={updateStatus}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // 🏠 COMPONENTE APP PRINCIPALE
        function App() {
            const { user, loading } = useAuth();

            if (loading) {
                return (
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                            <i className="fas fa-spinner fa-spin text-blue-600 text-4xl mb-4"></i>
                            <p className="text-gray-600">Caricamento dashboard...</p>
                        </div>
                    </div>
                );
            }

            // Se l'utente non è loggato, mostra la pagina di login
            if (!user) {
                return <LoginPage />;
            }

            // Se l'utente è loggato, mostra la dashboard
            return <Dashboard />;
        }

