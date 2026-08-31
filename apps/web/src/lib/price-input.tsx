"use client";

// Campo de preço com máscara em tempo real: só aceita dígitos, que
// preenchem os centavos da direita pra esquerda (igual app de banco) —
// sempre exatamente 2 casas decimais, com separador de milhar, impossível
// digitar um valor inválido.
export function PriceInput({
  cents,
  onChange,
  className,
  placeholder,
  required,
}: {
  cents: number;
  onChange: (cents: number) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    onChange(digitsOnly === "" ? 0 : parseInt(digitsOnly, 10));
  }

  const formatted =
    cents === 0
      ? ""
      : (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <input
      type="text"
      inputMode="numeric"
      required={required}
      placeholder={placeholder}
      value={formatted}
      onChange={handleChange}
      className={className}
    />
  );
}
