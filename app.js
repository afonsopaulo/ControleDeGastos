// #############################################################################
// ##                                                                         ##
// ##          JAVASCRIPT PARA APLICAÇÃO DE CONTROLE DE GASTOS                ##
// ##         !!! ALERTA DE SEGURANÇA: USE SUAS CHAVES REAIS AQUI !!!         ##
// ##         !!! MAS NUNCA COMPARTILHE ESTE ARQUIVO COM ELAS !!!             ##
// #############################################################################

// -----------------------------------------------------------------------------
// Configuração do Cliente Supabase
// -----------------------------------------------------------------------------
// !!! SUBSTITUA PELAS SUAS CREDENCIAIS REGENERADAS E MANTENHA-AS PRIVADAS !!!
const SUPABASE_URL = 'https://gqznrudnqmkmbckpffjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxem5ydWRucW1rbWJja3BmZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzODEwNjUsImV4cCI6MjA2Mzk1NzA2NX0.pjgs6PIQxMyAOKt1Ap5UeW5X6vS8w3XE5lgwtTW30pI';


const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// Seletores do DOM
// -----------------------------------------------------------------------------
const transactionForm = document.getElementById('transaction-form');
const categoryForm = document.getElementById('category-form');
const authSection = document.getElementById('auth-section');
const authContent = document.getElementById('auth-content');
const userInfo = document.getElementById('user-info');
const userEmailDisplay = document.getElementById('user-email');
const userIdDisplay = document.getElementById('user-id-display');
const mainContent = document.getElementById('main-content');
const logoutButton = document.getElementById('logout-button');
const manageCategoriesButton = document.getElementById('manage-categories-button');
const categoryModal = document.getElementById('category-modal');
const categoryModalCloseButton = document.getElementById('category-modal-close');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmationModalCloseButton = document.getElementById('confirmation-modal-close');
const confirmActionButton = document.getElementById('confirm-action-button');
const cancelActionButton = document.getElementById('cancel-action-button');
const confirmationModalTitle = document.getElementById('confirmation-modal-title');
const confirmationModalMessage = document.getElementById('confirmation-modal-message');
const categoryList = document.getElementById('category-list');
const transactionCategorySelect = document.getElementById('categoria_id');
const transactionsTableBody = document.getElementById('transactions-table-body');
const transactionIdInput = document.getElementById('transaction-id');
const categoryIdInput = document.getElementById('category-id');
const transactionDescriptionInput = document.getElementById('descricao');
const transactionValueInput = document.getElementById('valor');
const transactionDateInput = document.getElementById('data_transacao');
const transactionTypeInput = document.getElementById('tipo_transacao');
const saveTransactionButton = document.getElementById('save-transaction-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const feedbackMessageContainer = document.getElementById('feedback-message-container');

// Dashboard e Filtros
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const currentBalanceEl = document.getElementById('current-balance');
const periodFilterSelect = document.getElementById('period-filter');
const customDateRangeFilterDiv = document.getElementById('custom-date-range-filter');
const startDateFilterInput = document.getElementById('start-date-filter');
const endDateFilterInput = document.getElementById('end-date-filter');
const applyCustomFilterButton = document.getElementById('apply-custom-filter-button');

// Orçamentos
const budgetMonthFilterInput = document.getElementById('budget-month-filter');
const budgetListContainer = document.getElementById('budget-list-container');
const loadingBudgetsMessage = document.getElementById('loading-budgets-message');

// Variáveis Globais
let currentUserId = null;
let currentCategories = [];
let allFetchedTransactions = []; // Armazena TODAS as transações do usuário
let currentConfirmCallback = null;

// -----------------------------------------------------------------------------
// Funções Utilitárias
// -----------------------------------------------------------------------------
function showFeedbackMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `feedback-message ${type}`;
    messageDiv.textContent = message;
    feedbackMessageContainer.appendChild(messageDiv);
    setTimeout(() => { messageDiv.classList.add('show'); }, 10);
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (feedbackMessageContainer.contains(messageDiv)) {
                feedbackMessageContainer.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

function openCategoryModal() {
    categoryModal.style.display = 'block';
    categoryForm.reset();
    categoryIdInput.value = '';
    document.getElementById('category-modal-title').textContent = 'Adicionar Nova Categoria';
    loadCategories(); // Recarrega a lista de categorias no modal
}
function closeCategoryModal() {
    categoryModal.style.display = 'none';
}
function openConfirmationModal(title, message, onConfirm) {
    confirmationModalTitle.textContent = title;
    confirmationModalMessage.textContent = message;
    currentConfirmCallback = onConfirm;
    confirmationModal.style.display = 'block';
}
function closeConfirmationModal() {
    confirmationModal.style.display = 'none';
    currentConfirmCallback = null;
}
function formatCurrency(value) {
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}
function resetTransactionForm() {
    transactionForm.reset();
    transactionIdInput.value = '';
    transactionDateInput.valueAsDate = new Date();
    saveTransactionButton.textContent = 'Salvar Transação';
    cancelEditButton.classList.add('hidden');
    if(transactionDescriptionInput) transactionDescriptionInput.focus();
}
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatMonthYearForStorage(dateInput) {
    const date = new Date(dateInput + "T00:00:00");
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

// -----------------------------------------------------------------------------
// Lógica de Filtro de Período do Dashboard
// -----------------------------------------------------------------------------
function getDateRangeForFilter(periodValue) {
    const now = new Date();
    let startDate, endDate;
    switch (periodValue) {
        case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            startDate = startDateFilterInput.value ? new Date(startDateFilterInput.value + "T00:00:00") : null;
            endDate = endDateFilterInput.value ? new Date(endDateFilterInput.value + "T23:59:59") : null;
            if (startDate && endDate && startDate > endDate) {
                showFeedbackMessage('A data inicial não pode ser maior que a data final.', 'error');
                return { startDate: null, endDate: null };
            }
            break;
        case 'all_time':
        default:
            return { startDate: null, endDate: null };
    }
    return {
        startDate: startDate ? formatDateToYYYYMMDD(startDate) : null,
        endDate: endDate ? formatDateToYYYYMMDD(endDate) : null
    };
}
async function applyPeriodFilter() {
    console.log('applyPeriodFilter chamada');
    if (!currentUserId) {
        console.log('applyPeriodFilter: currentUserId é nulo, a retornar.');
        return;
    }
    const selectedPeriod = periodFilterSelect.value;
    console.log('applyPeriodFilter: selectedPeriod:', selectedPeriod);
    if (selectedPeriod === 'custom') {
        customDateRangeFilterDiv.classList.remove('hidden');
        if (!startDateFilterInput.value || !endDateFilterInput.value) {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            if(startDateFilterInput) startDateFilterInput.value = formatDateToYYYYMMDD(firstDayOfMonth);
            if(endDateFilterInput) endDateFilterInput.value = formatDateToYYYYMMDD(today);
        }
        return;
    } else {
        customDateRangeFilterDiv.classList.add('hidden');
    }
    const { startDate, endDate } = getDateRangeForFilter(selectedPeriod);
    console.log('applyPeriodFilter: startDate:', startDate, 'endDate:', endDate);
    await fetchAllUserTransactionsIfNeeded();
    renderFilteredTransactionsAndDashboard(startDate, endDate);
}

// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------
function updateDashboard(filteredTransactions = []) {
    console.log('updateDashboard chamada com transações:', filteredTransactions);
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
        const value = parseFloat(t.valor);
        if (t.tipo === 'receita') income += value;
        else if (t.tipo === 'despesa') expense += value;
    });
    const balance = income - expense;
    if(totalIncomeEl) totalIncomeEl.textContent = formatCurrency(income);
    if(totalExpenseEl) totalExpenseEl.textContent = formatCurrency(expense);
    if(currentBalanceEl) {
        currentBalanceEl.textContent = formatCurrency(balance);
        currentBalanceEl.classList.remove('text-green-700', 'text-red-700', 'text-blue-700', 'dark:text-green-200', 'dark:text-red-200', 'dark:text-blue-200');
        if (balance > 0) currentBalanceEl.classList.add('text-green-700', 'dark:text-green-200');
        else if (balance < 0) currentBalanceEl.classList.add('text-red-700', 'dark:text-red-200');
        else currentBalanceEl.classList.add('text-blue-700', 'dark:text-blue-200');
    }
}

// -----------------------------------------------------------------------------
// Autenticação
// -----------------------------------------------------------------------------
async function updateUserAuthState(user) {
    console.log('updateUserAuthState chamada. User:', user);
    if (user) {
        currentUserId = user.id;
        console.log('updateUserAuthState: User ID definido:', currentUserId);
        if(authSection) authSection.classList.add('hidden');
        if(mainContent) mainContent.classList.remove('hidden');
        if(userInfo) userInfo.classList.remove('hidden');
        if(userEmailDisplay) userEmailDisplay.textContent = user.email;
        if(userIdDisplay) userIdDisplay.textContent = `ID: ${user.id.substring(0, 8)}...`;
        if(budgetMonthFilterInput) budgetMonthFilterInput.value = formatMonthYearForStorage(new Date());

        await loadCategories();
        await fetchAllUserTransactionsIfNeeded();
        await applyPeriodFilter();
        await loadAndDisplayBudgets();
    } else {
        console.log('updateUserAuthState: Nenhum utilizador logado.');
        currentUserId = null;
        if(authSection) authSection.classList.remove('hidden');
        if(mainContent) mainContent.classList.add('hidden');
        if(userInfo) userInfo.classList.add('hidden');
        renderAuthForm();
        if(transactionsTableBody) transactionsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">Faça login para ver suas transações.</td></tr>';
        if(categoryList) categoryList.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Faça login para ver suas categorias.</li>';
        if(transactionCategorySelect) transactionCategorySelect.innerHTML = '<option value="">Faça login para carregar categorias</option>';
        if(budgetListContainer) budgetListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Faça login para ver seus orçamentos.</p>';
        allFetchedTransactions = [];
        updateDashboard([]);
    }
}
function renderAuthForm() {
    if(!authContent) return;
    authContent.innerHTML = `
        <form id="auth-form-dynamic" class="space-y-4">
            <div><label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input type="email" id="email" name="email" required autocomplete="email" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></div>
            <div><label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label><input type="password" id="password" name="password" required autocomplete="current-password" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></div>
            <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"><button type="submit" name="login" class="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold rounded-md transition duration-150">Entrar</button><button type="submit" name="signup" class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-semibold rounded-md transition duration-150">Cadastrar</button></div>
        </form>`;
    const dynamicAuthForm = document.getElementById('auth-form-dynamic');
    if(dynamicAuthForm) dynamicAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        const action = e.submitter.name;
        try {
            let response;
            if (action === 'signup') {
                response = await supabaseClient.auth.signUp({ email, password });
                if (response.error) throw response.error;
                if (response.data.user && !response.data.session) showFeedbackMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.', 'success');
                else if (response.data.user && response.data.session) showFeedbackMessage('Cadastro e login realizados com sucesso!', 'success');
                else showFeedbackMessage('Cadastro realizado. Pode ser necessário confirmar o e-mail.', 'success');
            } else if (action === 'login') {
                response = await supabaseClient.auth.signInWithPassword({ email, password });
                if (response.error) throw response.error;
                showFeedbackMessage('Login realizado com sucesso!', 'success');
            }
        } catch (error) {
            showFeedbackMessage(`Erro no ${action === 'login' ? 'login' : 'cadastro'}: ${error.message}`, 'error');
        }
    });
}
async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        showFeedbackMessage('Logout realizado com sucesso!', 'success');
        allFetchedTransactions = [];
    } catch (error) {
        showFeedbackMessage(`Erro no logout: ${error.message}`, 'error');
    }
}

// -----------------------------------------------------------------------------
// Categorias (CRUD)
// -----------------------------------------------------------------------------
async function loadCategories() {
    console.log('loadCategories chamada. currentUserId:', currentUserId);
    if (!currentUserId) {
        console.warn('loadCategories: currentUserId é nulo, a retornar.');
        if(categoryList) categoryList.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Faça login para ver categorias.</li>';
        if(transactionCategorySelect) transactionCategorySelect.innerHTML = '<option value="">Faça login para carregar</option>';
        return;
    }
    try {
        console.log('loadCategories: A buscar categorias do Supabase...');
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .eq('user_id', currentUserId)
            .order('nome', { ascending: true });

        console.log('loadCategories: Resposta do Supabase - data:', data, 'error:', error);

        if (error) {
            console.error('loadCategories: Erro do Supabase ao buscar categorias:', error);
            throw error;
        }
        currentCategories = data || [];
        console.log('loadCategories: currentCategories definido:', currentCategories);

        if(categoryList) {
            categoryList.innerHTML = '';
            if (currentCategories.length === 0) {
                console.log('loadCategories: Nenhuma categoria encontrada para o modal.');
                categoryList.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Nenhuma categoria cadastrada.</li>';
            } else {
                console.log('loadCategories: A preencher lista de categorias no modal.');
                currentCategories.forEach(category => {
                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700';
                    li.innerHTML = `<span>${category.nome} (${category.tipo})</span><div><button data-id="${category.id}" class="edit-category-button text-sm text-blue-500 hover:text-blue-700 mr-2">Editar</button><button data-id="${category.id}" data-name="${category.nome}" class="delete-category-button text-sm text-red-500 hover:text-red-700">Excluir</button></div>`;
                    categoryList.appendChild(li);
                });
            }
        }

        if(transactionCategorySelect) {
            console.log('loadCategories: A preencher select de transação.');
            if (currentCategories.length === 0) {
                transactionCategorySelect.innerHTML = '<option value="">Nenhuma categoria disponível</option>';
                console.log('loadCategories: Select de transação definido para "Nenhuma categoria disponível".');
            } else {
                transactionCategorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';
                currentCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = `${category.nome} (${category.tipo})`;
                    option.dataset.tipo = category.tipo;
                    transactionCategorySelect.appendChild(option);
                });
                console.log('loadCategories: Select de transação preenchido com categorias.');
            }
        }
        addCategoryActionListeners();
        console.log('loadCategories: Finalizada com sucesso.');
    } catch (error) {
        console.error('loadCategories: Erro capturado no bloco catch:', error);
        showFeedbackMessage(`Erro ao carregar categorias: ${error.message}`, 'error');
        if(categoryList) categoryList.innerHTML = '<li class="text-red-500 dark:text-red-400">Erro ao carregar categorias.</li>';
        if(transactionCategorySelect) transactionCategorySelect.innerHTML = '<option value="">Erro ao carregar categorias</option>';
    }
}

function addCategoryActionListeners() {
    document.querySelectorAll('.edit-category-button').forEach(b => b.onclick = (e) => {
        const category = currentCategories.find(c => c.id === e.target.dataset.id);
        if (category) {
            if(document.getElementById('category-modal-title')) document.getElementById('category-modal-title').textContent = 'Editar Categoria';
            if(document.getElementById('category-name')) document.getElementById('category-name').value = category.nome;
            if(document.getElementById('category-type')) document.getElementById('category-type').value = category.tipo;
            if(categoryIdInput) categoryIdInput.value = category.id;
            if(categoryModal) categoryModal.style.display = 'block';
        }
    });
    document.querySelectorAll('.delete-category-button').forEach(b => b.onclick = (e) => {
        openConfirmationModal('Excluir Categoria', `Tem certeza que deseja excluir "${e.target.dataset.name}"?`, () => deleteCategory(e.target.dataset.id));
    });
}
async function handleCategoryFormSubmit(e) {
    e.preventDefault();
    if (!currentUserId) return;
    const name = document.getElementById('category-name').value.trim();
    const type = document.getElementById('category-type').value;
    const id = categoryIdInput.value;
    if (!name || !type) { showFeedbackMessage('Nome e tipo são obrigatórios.', 'error'); return; }
    try {
        const data = { user_id: currentUserId, nome: name, tipo: type };
        const { error } = id ? await supabaseClient.from('categorias').update(data).eq('id', id).eq('user_id', currentUserId)
                             : await supabaseClient.from('categorias').insert(data);
        if (error) throw error;
        showFeedbackMessage(`Categoria ${id ? 'atualizada' : 'adicionada'}!`, 'success');
        closeCategoryModal();
        await loadCategories();
        await loadAndDisplayBudgets();
    } catch (error) {
        showFeedbackMessage(`Erro: ${error.message}`, 'error');
    }
}
async function deleteCategory(categoryId) {
    try {
        const { error } = await supabaseClient.from('categorias').delete().eq('id', categoryId).eq('user_id', currentUserId);
        if (error) throw error;
        showFeedbackMessage('Categoria excluída!', 'success');
        await loadCategories();
        await fetchAllUserTransactionsIfNeeded();
        await applyPeriodFilter();
        await loadAndDisplayBudgets();
    } catch (error) {
        showFeedbackMessage(`Erro ao excluir: ${error.message}`, 'error');
    }
}

// -----------------------------------------------------------------------------
// Orçamentos Mensais
// -----------------------------------------------------------------------------
async function loadAndDisplayBudgets() {
    console.log('loadAndDisplayBudgets chamada.');
    if (!currentUserId) { console.warn("loadAndDisplayBudgets: currentUserId é nulo."); return; }
    const selectedMonthYear = budgetMonthFilterInput.value;
    if (!selectedMonthYear) {
        if(budgetListContainer) budgetListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Selecione um mês para ver os orçamentos.</p>';
        return;
    }
    console.log('loadAndDisplayBudgets: Mês selecionado:', selectedMonthYear);
    if(loadingBudgetsMessage) loadingBudgetsMessage.style.display = 'block';
    if(budgetListContainer) budgetListContainer.innerHTML = '';

    try {
        console.log('loadAndDisplayBudgets: A buscar categorias de despesa...');
        const { data: expenseCategories, error: catError } = await supabaseClient.from('categorias').select('id, nome').eq('user_id', currentUserId).eq('tipo', 'despesa').order('nome');
        if (catError) throw catError;
        console.log('loadAndDisplayBudgets: Categorias de despesa encontradas:', expenseCategories);

        if (!expenseCategories || expenseCategories.length === 0) {
            if(loadingBudgetsMessage) loadingBudgetsMessage.style.display = 'none';
            if(budgetListContainer) budgetListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Nenhuma categoria de despesa para definir orçamentos.</p>';
            return;
        }

        console.log('loadAndDisplayBudgets: A buscar orçamentos para o mês:', selectedMonthYear);
        const { data: budgets, error: budgetError } = await supabaseClient.from('orcamentos').select('categoria_id, valor_orcado').eq('user_id', currentUserId).eq('mes_ano', selectedMonthYear);
        if (budgetError) throw budgetError;
        console.log('loadAndDisplayBudgets: Orçamentos encontrados:', budgets);
        const budgetMap = new Map(budgets.map(b => [b.categoria_id, b.valor_orcado]));

        console.log('loadAndDisplayBudgets: A calcular gastos por categoria...');
        await fetchAllUserTransactionsIfNeeded();
        const transactionsInSelectedMonth = allFetchedTransactions.filter(t => t.tipo === 'despesa' && formatMonthYearForStorage(t.data_transacao) === selectedMonthYear);
        const expensesByCategory = {};
        transactionsInSelectedMonth.forEach(t => {
            if (t.categoria_id) expensesByCategory[t.categoria_id] = (expensesByCategory[t.categoria_id] || 0) + parseFloat(t.valor);
        });
        console.log('loadAndDisplayBudgets: Gastos por categoria calculados:', expensesByCategory);

        expenseCategories.forEach(category => {
            const budgetAmount = budgetMap.get(category.id) || 0;
            const spentAmount = expensesByCategory[category.id] || 0;
            renderBudgetItem(category, budgetAmount, spentAmount, selectedMonthYear);
        });
        if(loadingBudgetsMessage) loadingBudgetsMessage.style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
        if(loadingBudgetsMessage) loadingBudgetsMessage.style.display = 'none';
        if(budgetListContainer) budgetListContainer.innerHTML = `<p class="text-red-500 dark:text-red-400">Erro ao carregar orçamentos: ${error.message}</p>`;
    }
}

function renderBudgetItem(category, budgetAmount, spentAmount, monthYear) {
    const budgetItemDiv = document.createElement('div');
    budgetItemDiv.className = 'p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow';
    const percentageSpent = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
    const cappedPercentage = Math.min(percentageSpent, 100);
    const remainingAmount = budgetAmount - spentAmount;
    let progressBarColor = 'bg-green-500';
    if (percentageSpent > 75 && percentageSpent <= 100) progressBarColor = 'bg-yellow-500';
    else if (percentageSpent > 100) progressBarColor = 'bg-red-500';

    budgetItemDiv.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
            <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200">${category.nome}</h4>
            <div class="flex items-center gap-2 mt-2 sm:mt-0">
                <label for="budget-${category.id}-${monthYear}" class="sr-only">Orçamento para ${category.nome}</label>
                <input type="number" id="budget-${category.id}-${monthYear}" class="budget-amount-input w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm text-sm" placeholder="R$ 0,00" value="${budgetAmount > 0 ? budgetAmount.toFixed(2) : ''}" data-category-id="${category.id}" data-month-year="${monthYear}">
                <button class="save-budget-button px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm" data-category-id="${category.id}" data-month-year="${monthYear}">Salvar</button>
            </div>
        </div>
        <div class="mb-1"><div class="flex justify-between text-sm text-gray-600 dark:text-gray-400"><span>Gasto: ${formatCurrency(spentAmount)}</span><span>Orçado: ${formatCurrency(budgetAmount)}</span></div></div>
        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-2"><div class="budget-progress-bar ${progressBarColor} h-2.5 rounded-full" style="width: ${cappedPercentage}%"></div></div>
        <div class="text-sm text-right ${remainingAmount < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}">Restante: ${formatCurrency(remainingAmount)}</div>`;
    if(budgetListContainer) budgetListContainer.appendChild(budgetItemDiv);
}

async function handleSaveBudget(event) {
    if (!event.target.classList.contains('save-budget-button')) return;
    const button = event.target;
    const categoryId = button.dataset.categoryId;
    const monthYear = button.dataset.monthYear;
    const inputElement = document.getElementById(`budget-${categoryId}-${monthYear}`);
    const budgetAmount = parseFloat(inputElement.value);
    if (isNaN(budgetAmount) || budgetAmount < 0) { showFeedbackMessage('Valor do orçamento inválido.', 'error'); return; }
    try {
        const { error } = await supabaseClient.from('orcamentos').upsert({ user_id: currentUserId, categoria_id: categoryId, mes_ano: monthYear, valor_orcado: budgetAmount }, { onConflict: 'user_id, categoria_id, mes_ano' }).select();
        if (error) throw error;
        showFeedbackMessage('Orçamento salvo!', 'success');
        await loadAndDisplayBudgets();
    } catch (error) {
        showFeedbackMessage(`Erro ao salvar orçamento: ${error.message}`, 'error');
    }
}

// -----------------------------------------------------------------------------
// Transações (CRUD)
// -----------------------------------------------------------------------------
async function fetchAllUserTransactionsIfNeeded() {
    console.log('fetchAllUserTransactionsIfNeeded chamada. currentUserId:', currentUserId);
    if (!currentUserId) { console.warn("fetchAllUserTransactionsIfNeeded: currentUserId é nulo."); return; }
    try {
        console.log('fetchAllUserTransactionsIfNeeded: A buscar todas as transações...');
        const { data, error } = await supabaseClient.from('transacoes').select('id, descricao, valor, data_transacao, tipo, categoria_id, categorias ( nome )').eq('user_id', currentUserId).order('data_transacao', { ascending: false });
        if (error) throw error;
        allFetchedTransactions = data || [];
        console.log('fetchAllUserTransactionsIfNeeded: Transações buscadas:', allFetchedTransactions.length);
    } catch (error) {
        console.error('Erro ao buscar todas as transações:', error);
        allFetchedTransactions = [];
    }
}

function renderFilteredTransactionsAndDashboard(startDate = null, endDate = null) {
    console.log('renderFilteredTransactionsAndDashboard chamada. startDate:', startDate, 'endDate:', endDate);
    let transactionsToDisplay = allFetchedTransactions;
    if (startDate || endDate) {
        transactionsToDisplay = allFetchedTransactions.filter(t => {
            const transactionDate = t.data_transacao;
            let match = true;
            if (startDate && transactionDate < startDate) match = false;
            if (endDate && transactionDate > endDate) match = false;
            return match;
        });
    }
    console.log('renderFilteredTransactionsAndDashboard: Transações para exibir:', transactionsToDisplay.length);

    if(transactionsTableBody) {
        transactionsTableBody.innerHTML = '';
        if (transactionsToDisplay.length > 0) {
            transactionsToDisplay.forEach(t => {
                const row = transactionsTableBody.insertRow();
                row.className = "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150";
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">${t.descricao || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${t.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${formatCurrency(t.valor)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${new Date(t.data_transacao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${t.categorias ? t.categorias.nome : 'Sem categoria'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.tipo === 'receita' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'}">${t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button data-id="${t.id}" class="edit-transaction-button text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">Editar</button><button data-id="${t.id}" data-desc="${t.descricao || 'esta transação'}" class="delete-transaction-button text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Excluir</button></td>`;
            });
        } else {
            transactionsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">Nenhuma transação encontrada para este período.</td></tr>';
        }
    }
    addTransactionActionListeners();
    updateDashboard(transactionsToDisplay);
}

function addTransactionActionListeners() {
    document.querySelectorAll('.edit-transaction-button').forEach(b => b.onclick = async (e) => {
        const { data: t, error } = await supabaseClient.from('transacoes').select('*').eq('id', e.target.dataset.id).single();
        if (error) { showFeedbackMessage('Erro ao buscar transação.', 'error'); return; }
        if(transactionForm.descricao) transactionForm.descricao.value = t.descricao;
        if(transactionForm.valor) transactionForm.valor.value = t.valor;
        if(transactionForm.data_transacao) transactionForm.data_transacao.value = t.data_transacao;
        if(transactionForm.categoria_id) transactionForm.categoria_id.value = t.categoria_id || '';
        if(transactionForm.tipo_transacao) transactionForm.tipo_transacao.value = t.tipo;
        if(transactionIdInput) transactionIdInput.value = t.id;
        if(saveTransactionButton) saveTransactionButton.textContent = 'Atualizar Transação';
        if(cancelEditButton) cancelEditButton.classList.remove('hidden');
        if(transactionDescriptionInput) transactionDescriptionInput.focus();
        if(transactionForm) window.scrollTo({ top: transactionForm.offsetTop - 20, behavior: 'smooth' });
    });
    document.querySelectorAll('.delete-transaction-button').forEach(b => b.onclick = (e) => {
        openConfirmationModal('Excluir Transação', `Tem certeza que deseja excluir "${e.target.dataset.desc}"?`, () => deleteTransaction(e.target.dataset.id));
    });
}
async function handleTransactionFormSubmit(e) {
    e.preventDefault();
    if (!currentUserId) return;
    const data = { user_id: currentUserId, descricao: transactionDescriptionInput.value.trim(), valor: parseFloat(transactionValueInput.value), data_transacao: transactionDateInput.value, categoria_id: transactionCategorySelect.value || null, tipo: transactionTypeInput.value };
    const id = transactionIdInput.value;
    if (!data.valor || !data.data_transacao || !data.tipo || data.valor <= 0) { showFeedbackMessage('Valor (positivo), data e tipo são obrigatórios.', 'error'); return; }
    try {
        const { error } = id ? await supabaseClient.from('transacoes').update(data).eq('id', id).eq('user_id', currentUserId) : await supabaseClient.from('transacoes').insert(data);
        if (error) throw error;
        showFeedbackMessage(`Transação ${id ? 'atualizada' : 'adicionada'}!`, 'success');
        await fetchAllUserTransactionsIfNeeded();
        await applyPeriodFilter();
        await loadAndDisplayBudgets();
        resetTransactionForm();
    } catch (error) { showFeedbackMessage(`Erro: ${error.message}`, 'error'); }
}
async function deleteTransaction(transactionId) {
    try {
        const { error } = await supabaseClient.from('transacoes').delete().eq('id', transactionId).eq('user_id', currentUserId);
        if (error) throw error;
        showFeedbackMessage('Transação excluída!', 'success');
        await fetchAllUserTransactionsIfNeeded();
        await applyPeriodFilter();
        await loadAndDisplayBudgets();
    } catch (error) { showFeedbackMessage(`Erro ao excluir: ${error.message}`, 'error'); }
}

// -----------------------------------------------------------------------------
// Event Listeners Iniciais
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: A aplicação está a iniciar.");
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        console.log("DOMContentLoaded: Sessão inicial obtida:", session);
        updateUserAuthState(session?.user ?? null);
    });
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        console.log("onAuthStateChange: Mudança de estado de autenticação:", _event, session);
        updateUserAuthState(session?.user ?? null);
    });

    if(logoutButton) logoutButton.addEventListener('click', handleLogout);
    if(manageCategoriesButton) manageCategoriesButton.addEventListener('click', openCategoryModal);
    if(categoryModalCloseButton) categoryModalCloseButton.addEventListener('click', closeCategoryModal);
    if(confirmationModalCloseButton) confirmationModalCloseButton.addEventListener('click', closeConfirmationModal);
    if(cancelActionButton) cancelActionButton.addEventListener('click', closeConfirmationModal);
    if(categoryForm) categoryForm.addEventListener('submit', handleCategoryFormSubmit);
    if(transactionForm) transactionForm.addEventListener('submit', handleTransactionFormSubmit);
    if(cancelEditButton) cancelEditButton.addEventListener('click', resetTransactionForm);
    if(periodFilterSelect) periodFilterSelect.addEventListener('change', applyPeriodFilter);
    if(applyCustomFilterButton) applyCustomFilterButton.addEventListener('click', () => {
        const { startDate, endDate } = getDateRangeForFilter('custom');
        if (startDate !== null || endDate !== null) renderFilteredTransactionsAndDashboard(startDate, endDate);
        else if (startDateFilterInput.value && endDateFilterInput.value) {}
        else showFeedbackMessage('Selecione as datas para o filtro personalizado.', 'error');
    });
    if(budgetMonthFilterInput) budgetMonthFilterInput.addEventListener('change', loadAndDisplayBudgets);
    if(budgetListContainer) budgetListContainer.addEventListener('click', handleSaveBudget);

    window.addEventListener('click', (event) => {
        if (event.target === categoryModal) closeCategoryModal();
        if (event.target === confirmationModal) closeConfirmationModal();
    });
    if(transactionCategorySelect) transactionCategorySelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption && selectedOption.dataset.tipo && transactionTypeInput) transactionTypeInput.value = selectedOption.dataset.tipo;
    });
    if(confirmActionButton) confirmActionButton.addEventListener('click', () => {
        if (currentConfirmCallback) currentConfirmCallback();
    });

    resetTransactionForm();
    console.log("app.js carregado e pronto.");
});
