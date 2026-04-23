import { describe, expect, it } from 'vitest'
import {
  applyApprovalCleanup,
  extractSectionsFromLayoutPages,
  getRepoCompatibleSizeLabel,
  type ProductTemplateRow,
} from '../../scripts/section-gated-pdf-import'

function composeLine(left: string, right = '', splitColumn = 82) {
  return `${left.padEnd(splitColumn)}${right}`
}

describe('section-gated pdf import', () => {
  it('keeps left and right section streams independent and carries pack-only headers forward', () => {
    const parsed = extractSectionsFromLayoutPages([
      {
        pageNumber: 1,
        lines: [
          composeLine('PRODUCT DESCRIPTION', 'PRODUCT DESCRIPTION'),
          composeLine('COKE PRODUCTS 24/20 OZ. COST', 'PEPSI PRODUCTS 24/20 OZ. COST'),
          composeLine('CHERRY COKE ($32.95)', 'CHERRY PEPSI ($32.95)'),
          composeLine('24/8 OZ. GLASS BOTTLES', 'PEPSI PRODUCTS 24/12 OZ. CANS'),
          composeLine('COKE ($37.50)', 'PEPSI ($19.75)'),
        ],
      },
    ])

    expect(parsed.sections).toHaveLength(4)
    expect(parsed.sections[0]?.proposedRule.brandName).toBe('Coca-Cola')
    expect(parsed.sections[1]?.proposedRule.brandName).toBe('Pepsi')
    expect(parsed.sections[2]?.rawSectionHeader).toBe('24/8 OZ. GLASS BOTTLES')
    expect(parsed.sections[2]?.proposedRule.brandName).toBe('Coca-Cola')
    expect(parsed.sections[3]?.rawSectionHeader).toBe('PEPSI PRODUCTS 24/12 OZ. CANS')
    expect(parsed.sections[3]?.proposedRule.brandName).toBe('Pepsi')
  })

  it('uses the brand as a fallback title for pack-only rows under a brand-only header', () => {
    const parsed = extractSectionsFromLayoutPages([
      {
        pageNumber: 1,
        lines: [
          composeLine('POLAND SPRING WATER'),
          composeLine('12/1.5 LITER ($11.50)'),
          composeLine('24/700 ML SPORTS CAP ($11.50)'),
        ],
      },
    ])

    const [section] = parsed.sections
    expect(section?.proposedRule.rowMode).toBe('pack_only')
    expect(section?.proposedRows[0]?.output.title).toBe('Poland Spring Water')
    expect(section?.proposedRows[0]?.output.pack_details).toBe('12/1.5 LITER')
    expect(section?.proposedRows[0]?.output.pack_count).toBe(12)
    expect(section?.proposedRows[0]?.output.size_value).toBe(1.5)
    expect(section?.proposedRows[0]?.output.size_uom).toBe('LITER')
    expect(section?.proposedRows[1]?.output.pack_details).toBe('24/700 ML SPORTS CAP')
  })

  it('promotes inline pack tails into titles when the prefix is only the brand', () => {
    const parsed = extractSectionsFromLayoutPages([
      {
        pageNumber: 1,
        lines: [
          composeLine('VOSS WATERS'),
          composeLine('VOSS 12/800 ML SPARKLING ($36.00)'),
          composeLine('VOSS 12/800 ML STILL ($36.00)'),
        ],
      },
    ])

    const [section] = parsed.sections
    expect(section?.proposedRule.rowMode).toBe('flavor_with_inline_pack')
    expect(section?.proposedRows[0]?.output.title).toBe('Sparkling')
    expect(section?.proposedRows[0]?.output.pack_details).toBe('12/800 ML')
    expect(section?.proposedRows[1]?.output.title).toBe('Still')
  })

  it('builds repo-compatible size labels from structured rows', () => {
    const row: ProductTemplateRow = {
      brand_name: 'Coca-Cola',
      title: 'Cherry Coke',
      pack_details: '24/12 OZ CANS',
      pack_count: 24,
      size_value: 12,
      size_uom: 'OZ',
      price: 18.95,
      image_url: '',
      tags: '',
      is_new: false,
      is_discontinued: false,
    }

    expect(getRepoCompatibleSizeLabel(row)).toBe('12 OZ CANS')
  })

  it('cleans obvious source typos during approval', () => {
    const cleaned = applyApprovalCleanup({
      brand_name: 'Glacau Vitamin Water',
      title: "Welch'S Caffiene Free Diet Coke",
      pack_details: '24/20 OZ',
      pack_count: 24,
      size_value: 20,
      size_uom: 'OZ',
      price: 32.95,
      image_url: '',
      tags: '',
      is_new: false,
      is_discontinued: false,
    })

    expect(cleaned.brand_name).toBe('Glaceau Vitamin Water')
    expect(cleaned.title).toBe("Welch's Caffeine Free Diet Coke")
  })
})
