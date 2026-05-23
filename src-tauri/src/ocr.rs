use std::cmp::Ordering;

#[cfg(target_os = "windows")]
use windows::{
    Storage::Streams::{InMemoryRandomAccessStream, DataWriter},
    Graphics::Imaging::BitmapDecoder,
    Media::Ocr::OcrEngine,
};

#[cfg(target_os = "windows")]
struct OcrLineLayout {
    text: String,
    left: f64,
    top: f64,
    right: f64,
    bottom: f64,
}

#[cfg(target_os = "windows")]
impl OcrLineLayout {
    fn width(&self) -> f64 {
        (self.right - self.left).max(0.0)
    }

    fn height(&self) -> f64 {
        (self.bottom - self.top).max(0.0)
    }
}

#[cfg(target_os = "windows")]
fn median(mut values: Vec<f64>) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    let mid = values.len() / 2;
    if values.len() % 2 == 1 {
        values[mid]
    } else {
        (values[mid - 1] + values[mid]) / 2.0
    }
}

#[cfg(target_os = "windows")]
fn compute_indent_spaces(indent_pixels: f64, median_char_width: f64) -> i32 {
    if indent_pixels <= 0.0 || median_char_width <= 0.0 {
        return 0;
    }
    (indent_pixels / median_char_width).round() as i32
}

#[cfg(target_os = "windows")]
fn format_recognized_text(lines: &[OcrLineLayout], fallback_text: Option<String>) -> String {
    if lines.is_empty() {
        return fallback_text.map(|t| t.trim().to_string()).unwrap_or_default();
    }

    let mut ordered: Vec<&OcrLineLayout> = lines
        .iter()
        .filter(|line| !line.text.trim().is_empty())
        .collect();

    ordered.sort_by(|a, b| {
        a.top
            .partial_cmp(&b.top)
            .unwrap_or(Ordering::Equal)
            .then_with(|| {
                a.left
                    .partial_cmp(&b.left)
                    .unwrap_or(Ordering::Equal)
            })
    });

    if ordered.is_empty() {
        return fallback_text.map(|t| t.trim().to_string()).unwrap_or_default();
    }

    let heights: Vec<f64> = ordered.iter().map(|line| line.height()).filter(|&h| h > 0.0).collect();
    let mut median_height = median(heights);
    if median_height <= 0.0 {
        median_height = 16.0;
    }

    let char_widths: Vec<f64> = ordered
        .iter()
        .map(|line| {
            let length = line.text.trim().chars().count();
            if length == 0 || line.width() <= 0.0 {
                0.0
            } else {
                line.width() / length as f64
            }
        })
        .filter(|&w| w > 0.0)
        .collect();
    let mut median_char_width = median(char_widths);
    if median_char_width <= 0.0 {
        median_char_width = (median_height * 0.45).max(6.0);
    }

    let min_left = ordered
        .iter()
        .map(|line| line.left)
        .fold(f64::INFINITY, f64::min);
    let baseline_window = (median_char_width * 2.0).max(8.0);
    let baseline_candidates: Vec<f64> = ordered
        .iter()
        .map(|line| line.left)
        .filter(|&left| left - min_left <= baseline_window)
        .collect();
    let baseline_left = if !baseline_candidates.is_empty() {
        baseline_candidates.iter().sum::<f64>() / baseline_candidates.len() as f64
    } else {
        min_left
    };

    let mut builder = String::new();
    let mut previous: Option<&OcrLineLayout> = None;

    for line in ordered {
        let text = line.text.trim();
        if text.is_empty() {
            continue;
        }

        let paragraph_break = if let Some(prior) = previous {
            (line.top - prior.bottom) > (median_height * 0.85).max(8.0)
        } else {
            false
        };

        let indent_spaces = compute_indent_spaces(line.left - baseline_left, median_char_width);
        let previous_indent = if let Some(prior) = previous {
            compute_indent_spaces(prior.left - baseline_left, median_char_width)
        } else {
            0
        };

        let paragraph_start = previous.is_none() || paragraph_break || indent_spaces >= previous_indent + 2;

        if !builder.is_empty() {
            if paragraph_start {
                builder.push_str("\n\n");
            } else {
                builder.push('\n');
            }
        }

        if paragraph_start && indent_spaces >= 2 {
            let clamped_indent = indent_spaces.clamp(2, 8) as usize;
            builder.push_str(&" ".repeat(clamped_indent));
        }

        builder.push_str(text);
        previous = Some(line);
    }

    builder.trim().to_string()
}

#[cfg(target_os = "windows")]
fn correct_spanish_diacritics(text: &str) -> String {
    if text.is_empty() {
        return text.to_string();
    }

    let chars: Vec<char> = text.chars().collect();
    let mut result = String::new();

    for i in 0..chars.len() {
        let c = chars[i];
        if c == '6' && i > 0 && i < chars.len() - 1 {
            let prev = chars[i - 1];
            let next = chars[i + 1];
            if prev.is_alphabetic() && next.is_alphabetic() {
                result.push('ó');
                continue;
            }
        }

        let corrected = match c {
            'å' => 'á',
            'ö' => 'ó',
            'Ö' => 'Ó',
            'ì' => 'í',
            'Ì' => 'Í',
            'è' => 'é',
            'È' => 'É',
            'ù' => 'ú',
            'Ù' => 'Ú',
            'ä' => 'á',
            'Ä' => 'Á',
            'ü' => 'ú',
            'Ü' => 'Ú',
            _ => c,
        };
        result.push(corrected);
    }

    result
}

fn apply_gamma_correction(img: &mut image::RgbaImage, gamma: f32) {
    let mut lut = [0u8; 256];
    for i in 0..256 {
        let normalized = i as f32 / 255.0;
        let corrected = normalized.powf(gamma);
        lut[i] = (corrected * 255.0).clamp(0.0, 255.0) as u8;
    }

    for pixel in img.pixels_mut() {
        pixel[0] = lut[pixel[0] as usize];
        pixel[1] = lut[pixel[1] as usize];
        pixel[2] = lut[pixel[2] as usize];
    }
}

fn apply_sharpening(img: &image::RgbaImage, amount: f32) -> image::RgbaImage {
    let (w, h) = img.dimensions();
    let mut output = img.clone();
    if w < 3 || h < 3 {
        return output;
    }

    let center_weight = 1.0 + amount * 4.0;
    let neighbor_weight = -amount;

    for y in 1..(h - 1) {
        for x in 1..(w - 1) {
            let mut new_px = [0u8; 4];
            for c in 0..3 {
                let center = img.get_pixel(x, y)[c] as f32;
                let top = img.get_pixel(x, y - 1)[c] as f32;
                let bottom = img.get_pixel(x, y + 1)[c] as f32;
                let left = img.get_pixel(x - 1, y)[c] as f32;
                let right = img.get_pixel(x + 1, y)[c] as f32;

                let val = center * center_weight
                    + top * neighbor_weight
                    + bottom * neighbor_weight
                    + left * neighbor_weight
                    + right * neighbor_weight;

                new_px[c] = val.clamp(0.0, 255.0) as u8;
            }
            new_px[3] = img.get_pixel(x, y)[3];
            output.put_pixel(x, y, image::Rgba(new_px));
        }
    }
    output
}

/// Preprocess and upscale image if needed to ensure the OCR engine gets high accuracy.
/// This crops out dark borders, samples corner colors to pad with the correct background,
/// and conditionally upscales extremely small images using Nearest neighbor filtering.
fn preprocess_and_upscale_image(png_bytes: &[u8]) -> Vec<u8> {
    match image::load_from_memory(png_bytes) {
        Ok(img) => {
            let (w, h) = image::GenericImageView::dimensions(&img);
            if w == 0 || h == 0 {
                return png_bytes.to_vec();
            }

            // 1. Content bounding box detection (Luma > 50 check)
            let mut min_x = w;
            let mut max_x = 0;
            let mut min_y = h;
            let mut max_y = 0;
            let mut found_content = false;

            for y in 0..h {
                for x in 0..w {
                    let p = image::GenericImageView::get_pixel(&img, x, y);
                    let luma = 0.299 * p[0] as f32 + 0.587 * p[1] as f32 + 0.114 * p[2] as f32;
                    if luma > 180.0 {
                        if x < min_x { min_x = x; }
                        if x > max_x { max_x = x; }
                        if y < min_y { min_y = y; }
                        if y > max_y { max_y = y; }
                        found_content = true;
                    }
                }
            }

            // If no content found or dimensions invalid, use original image as fallback
            let processed_img = if found_content && min_x <= max_x && min_y <= max_y {
                let cropped_w = max_x - min_x + 1;
                let cropped_h = max_y - min_y + 1;
                let cropped = img.crop_imm(min_x, min_y, cropped_w, cropped_h);

                // 2. Sample corner colors of the cropped image
                let c1 = image::GenericImageView::get_pixel(&cropped, 0, 0);
                let c2 = image::GenericImageView::get_pixel(&cropped, cropped_w - 1, 0);
                let c3 = image::GenericImageView::get_pixel(&cropped, 0, cropped_h - 1);
                let c4 = image::GenericImageView::get_pixel(&cropped, cropped_w - 1, cropped_h - 1);

                // Average color of the 4 corners
                let avg_r = ((c1[0] as u32 + c2[0] as u32 + c3[0] as u32 + c4[0] as u32) / 4) as u8;
                let avg_g = ((c1[1] as u32 + c2[1] as u32 + c3[1] as u32 + c4[1] as u32) / 4) as u8;
                let avg_b = ((c1[2] as u32 + c2[2] as u32 + c3[2] as u32 + c4[2] as u32) / 4) as u8;
                let avg_a = ((c1[3] as u32 + c2[3] as u32 + c3[3] as u32 + c4[3] as u32) / 4) as u8;
                let bg_color = image::Rgba([avg_r, avg_g, avg_b, avg_a]);

                // 3. Create a padded image with the detected background color
                let pad = 20;
                let new_w = cropped_w + pad * 2;
                let new_h = cropped_h + pad * 2;
                let mut padded = image::ImageBuffer::from_pixel(new_w, new_h, bg_color);

                // Overlay the cropped image onto the center of the padded image
                for cy in 0..cropped_h {
                    for cx in 0..cropped_w {
                        let pixel = image::GenericImageView::get_pixel(&cropped, cx, cy);
                        padded.put_pixel(cx + pad, cy + pad, pixel);
                    }
                }
                image::DynamicImage::ImageRgba8(padded)
            } else {
                img
            };

            // 4. Conditional upscaling
            let (pw, ph) = image::GenericImageView::dimensions(&processed_img);
            let longest = pw.max(ph);

            let mut final_img = if longest < 200 {
                // Upscale using Nearest neighbor for extremely small images to preserve sharp edges
                let scale = 200.0 / longest as f32;
                let new_w = ((pw as f32 * scale).round() as u32).max(1);
                let new_h = ((ph as f32 * scale).round() as u32).max(1);
                processed_img.resize(new_w, new_h, image::imageops::FilterType::Nearest)
            } else {
                processed_img
            };

            // Commented out filters for debugging
            // let mut rgba_buffer = final_img.to_rgba8();
            // apply_gamma_correction(&mut rgba_buffer, 0.75);
            // let sharpened = apply_sharpening(&rgba_buffer, 0.4);

            // Apply binarization to clean up anti-aliasing/gradients and maximize contrast
            // let mut binarized = sharpened;
            // for pixel in binarized.pixels_mut() {
            //     let luma = 0.299 * pixel[0] as f32 + 0.587 * pixel[1] as f32 + 0.114 * pixel[2] as f32;
            //     if luma < 120.0 {
            //         pixel[0] = 0;
            //         pixel[1] = 0;
            //         pixel[2] = 0;
            //     } else {
            //         pixel[0] = 255;
            //         pixel[1] = 255;
            //         pixel[2] = 255;
            //     }
            //     pixel[3] = 255; // Ensure the output is fully opaque to avoid WinRT OCR transparency issues
            // }
            // final_img = image::DynamicImage::ImageRgba8(binarized);

            let mut cursor = std::io::Cursor::new(Vec::new());
            if final_img.write_to(&mut cursor, image::ImageOutputFormat::Png).is_ok() {
                cursor.into_inner()
            } else {
                png_bytes.to_vec()
            }
        }
        Err(_) => png_bytes.to_vec(),
    }
}

#[cfg(target_os = "windows")]
pub async fn run_ocr(png_bytes: &[u8], language_tag: Option<&str>) -> Result<String, String> {
    if png_bytes.is_empty() {
        return Ok(String::new());
    }

    let prepared_bytes = preprocess_and_upscale_image(png_bytes);

    let run_impl = || async {
        let stream = InMemoryRandomAccessStream::new()?;
        let writer = DataWriter::CreateDataWriter(&stream)?;
        writer.WriteBytes(&prepared_bytes)?;
        writer.StoreAsync()?.await?;
        writer.FlushAsync()?.await?;
        stream.Seek(0)?;

        let decoder = BitmapDecoder::CreateAsync(&stream)?.await?;
        let software_bitmap = decoder.GetSoftwareBitmapAsync()?.await?;

        // Try creating engine for the specified language, fallback to user profile languages
        let engine = if let Some(lang_code) = language_tag {
            if let Ok(win_lang) = windows::Globalization::Language::CreateLanguage(&windows::core::HSTRING::from(lang_code)) {
                OcrEngine::TryCreateFromLanguage(&win_lang).or_else(|_| OcrEngine::TryCreateFromUserProfileLanguages())?
            } else {
                OcrEngine::TryCreateFromUserProfileLanguages()?
            }
        } else {
            OcrEngine::TryCreateFromUserProfileLanguages()?
        };
        let ocr_result = engine.RecognizeAsync(&software_bitmap)?.await?;

        let mut lines = Vec::new();
        for line in ocr_result.Lines()? {
            let text = line.Text()?.to_string();
            let words = line.Words()?;

            let mut left = f64::MAX;
            let mut top = f64::MAX;
            let mut right = f64::MIN;
            let mut bottom = f64::MIN;

            for word in words {
                let rect = word.BoundingRect()?;
                left = left.min(rect.X as f64);
                top = top.min(rect.Y as f64);
                right = right.max((rect.X + rect.Width) as f64);
                bottom = bottom.max((rect.Y + rect.Height) as f64);
            }

            if left != f64::MAX && top != f64::MAX && right != f64::MIN && bottom != f64::MIN {
                lines.push(OcrLineLayout {
                    text,
                    left,
                    top,
                    right,
                    bottom,
                });
            } else {
                lines.push(OcrLineLayout {
                    text,
                    left: 0.0,
                    top: 0.0,
                    right: 0.0,
                    bottom: 0.0,
                });
            }
        }

        let raw_text = format_recognized_text(&lines, Some(ocr_result.Text()?.to_string()));
        let corrected_text = correct_spanish_diacritics(&raw_text);
        Ok(corrected_text)
    };

    run_impl().await.map_err(|e: windows::core::Error| e.to_string())
}

#[cfg(not(target_os = "windows"))]
pub async fn run_ocr(_png_bytes: &[u8], _language_tag: Option<&str>) -> Result<String, String> {
    Ok(String::new())
}
