export default function Termos() {
  return (
    <div className="min-h-screen bg-spotnicik-light py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-spotnicik-primary mb-2">Termos de Uso e Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-8">SpotNICK Wi-Fi Zone — última atualização: agosto de 2026</p>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-spotnicik-dark mb-2">1. Sobre este documento</h2>
          <p className="text-spotnicik-dark text-sm">
            Ao criar uma conta no SpotNICK, você concorda com estes Termos de Uso e com o tratamento
            dos seus dados pessoais conforme descrito abaixo, em conformidade com a Lei Geral de
            Proteção de Dados (Lei nº 13.709/2018 — LGPD).
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-spotnicik-dark mb-2">2. Dados que coletamos</h2>
          <ul className="list-disc list-inside text-sm text-spotnicik-dark space-y-1">
            <li>Dados de cadastro: nome, e-mail, telefone e CPF</li>
            <li>Registros de conexão: horário de acesso, endereço IP e local utilizado (necessários por lei — Marco Civil da Internet)</li>
            <li>Dados de pagamento (quando aplicável): processados por nosso parceiro de pagamentos, não armazenamos dados de cartão</li>
          </ul>
          <p className="text-sm text-spotnicik-dark mt-2">
            Não coletamos nem armazenamos quais sites ou aplicativos você acessa durante a navegação.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-spotnicik-dark mb-2">3. Como usamos seus dados</h2>
          <ul className="list-disc list-inside text-sm text-spotnicik-dark space-y-1">
            <li>Fornecer e administrar o acesso ao Wi-Fi contratado</li>
            <li>Processar pagamentos de pacotes de acesso</li>
            <li>Cumprir obrigações legais de retenção de registros de conexão (13 meses)</li>
            <li>Enviar comunicações operacionais essenciais (confirmação de cadastro, recibos, avisos de segurança)</li>
            <li><strong>Enviar novidades e promoções por e-mail/SMS — apenas se você autorizar expressamente</strong>, podendo revogar a qualquer momento no seu perfil</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-spotnicik-dark mb-2">4. Compartilhamento de dados</h2>
          <p className="text-sm text-spotnicik-dark">
            Não vendemos seus dados pessoais a terceiros. Compartilhamos dados apenas com prestadores
            de serviço necessários à operação (processamento de pagamentos, envio de e-mail/SMS), e
            registros de conexão somente mediante ordem judicial ou requisição legal cabível.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-spotnicik-dark mb-2">5. Seus direitos</h2>
          <p className="text-sm text-spotnicik-dark mb-2">Nos termos da LGPD, você pode solicitar a qualquer momento:</p>
          <ul className="list-disc list-inside text-sm text-spotnicik-dark space-y-1">
            <li>Confirmação e acesso aos seus dados</li>
            <li>Correção de dados incompletos ou desatualizados</li>
            <li>Exclusão da sua conta e dados (respeitados os prazos legais de retenção de registros de conexão)</li>
            <li>Revogação do consentimento de marketing, a qualquer momento, no seu perfil</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-spotnicik-dark mb-2">6. Retenção de dados</h2>
          <p className="text-sm text-spotnicik-dark">
            Registros de conexão são mantidos por 13 meses, conforme o Art. 13 do Marco Civil da
            Internet, e removidos automaticamente após esse prazo. Demais dados cadastrais são
            mantidos enquanto sua conta estiver ativa.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-spotnicik-dark mb-2">7. Contato</h2>
          <p className="text-sm text-spotnicik-dark">
            Dúvidas sobre este documento ou sobre seus dados podem ser enviadas para o e-mail de
            suporte informado no aplicativo.
          </p>
        </section>

        <p className="text-xs text-gray-400 mt-8 border-t pt-4">
          Este documento é fornecido para fins informativos e deve ser revisado periodicamente pela
          assessoria jurídica da empresa.
        </p>
      </div>
    </div>
  );
}
