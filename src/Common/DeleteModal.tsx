import React from "react";
import { Button, Modal } from "react-bootstrap";

// Компонент модального окна для подтверждения удаления
const DeleteModal = ({ show, handleClose, handleDeleteId }: any) => {
    return (
        <React.Fragment>
            {/* Модальное окно с эффектом появления zoomIn */}
            <Modal show={show} onHide={handleClose} id="removeCartModal" className="fade zoomIn" dialogClassName="modal-dialog-centered">
                {/* Заголовок модального окна с кнопкой закрытия, без нижней границы */}
                <Modal.Header closeButton style={{ borderBottom: "none" }}></Modal.Header>
                {/* Тело модального окна */}
                <Modal.Body>
                    <div className="mt-2 text-center">
                        {/* Иконка корзины */}
                        <i className="ti ti-trash fs-1 text-danger"></i>
                        <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
                            {/* Заголовок с вопросом */}
                            <h5>Вы уверены?</h5>
                            {/* Текст с уточнением действия */}
                            <p className="text-muted mx-4 mb-0">Вы уверены, что хотите удалить эту задачу?</p>
                        </div>
                    </div>
                    {/* Кнопки действий */}
                    <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
                        {/* Кнопка закрытия модального окна */}
                        <Button type="button" variant="light" className="btn w-sm" onClick={handleClose}>
                            Закрыть
                        </Button>
                        {/* Кнопка подтверждения удаления */}
                        <Button type="submit" variant="danger" className="btn w-sm" id="remove-cartproduct" onClick={handleDeleteId}>
                            Да, удалить!
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        </React.Fragment>
    );
}

export default DeleteModal;